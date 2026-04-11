import { courseTemplates } from "@/data/courses/templates";
import { siteConfigs } from "@/data/sites/config";
import type {
  FlightBriefingRequest,
  FlightBriefingResponse,
  ScoreBreakdownItem,
  SiteRanking,
  WarningItem,
} from "@/types/briefing";
import type { CourseTemplate } from "@/types/course";
import type { SiteConfig } from "@/types/site";
import { clamp, isInRange, timeToMinutes } from "@/lib/engine/helpers";

type SiteEvaluation = {
  site: SiteConfig;
  score: number;
  grade: SiteRanking["grade"];
  warnings: WarningItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  recommendedCourse: CourseTemplate;
  alternativeCourse: CourseTemplate;
  launchWindow: {
    start: string;
    end: string;
    label: string;
  };
  highlight: string;
};

function buildPlanFromCourse(
  siteId: string,
  course: CourseTemplate,
  launchWindow: SiteEvaluation["launchWindow"]
) {
  return {
    siteId,
    courseId: course.courseId,
    courseName: course.name,
    courseType: course.courseType,
    distanceKm: {
      expected: Math.round((course.distanceKm.min + course.distanceKm.max) / 2),
      min: course.distanceKm.min,
      max: course.distanceKm.max,
    },
    launchWindow: {
      start: launchWindow.start,
      end: launchWindow.end,
    },
    turnpoints: course.mapRoute.map((turnpoint, index) => ({
      order: index + 1,
      name: turnpoint.name,
      label: turnpoint.label,
      lat: turnpoint.lat,
      lng: turnpoint.lng,
    })),
  };
}

function buildBottlenecks(course: CourseTemplate) {
  return course.bottlenecks.map((item) => ({
    id: item.id,
    type: item.type,
    severity: item.severity,
    name: item.name,
    message: item.description,
    location: item.location,
  }));
}

function gradeLabel(grade: SiteRanking["grade"]) {
  switch (grade) {
    case "mid_xc":
      return "중거리 XC";
    case "short_xc":
      return "짧은 XC";
    case "local_only":
      return "로컬 위주";
    default:
      return "비행 비추천";
  }
}

function statusLabel(status: SiteRanking["status"]) {
  switch (status) {
    case "recommended":
      return "메인 추천";
    case "available":
      return "대안 가능";
    case "caution":
      return "주의";
    default:
      return "추천 제외";
  }
}

function computeRangeScore(
  value: number,
  config: SiteConfig["windThresholds"]["surfaceKmh"],
  maxScore: number
) {
  if (value <= config.rejectBelow || value >= config.rejectAbove) {
    return 0;
  }

  if (isInRange(value, config.good)) {
    return maxScore;
  }

  if (
    isInRange(value, config.caution[0]) ||
    isInRange(value, config.caution[1])
  ) {
    return Math.round(maxScore * 0.58);
  }

  return Math.round(maxScore * 0.78);
}

function evaluateWindAlignment(site: SiteConfig, dir: FlightBriefingRequest["weatherInput"]["surfaceWindDir"]) {
  if (site.preferredWind.best.includes(dir)) {
    return { score: 25, highlight: "풍향 정렬 좋음" };
  }
  if (site.preferredWind.conditional.includes(dir)) {
    return { score: 18, highlight: "조건부 풍향" };
  }
  if (site.preferredWind.caution.includes(dir)) {
    return { score: 10, highlight: "풍향 주의" };
  }
  return { score: 0, highlight: "비추천 풍향" };
}

function resolveLaunchWindow(
  site: SiteConfig,
  thermalStartTime: string
): { start: string; end: string; label: string; penalty: number } {
  const thermalStart = timeToMinutes(thermalStartTime);
  const best = site.launchWindows.find((window) => window.grade === "main");
  if (!best) {
    return { start: "11:00", end: "12:00", label: "기본 추천 시간", penalty: 0 };
  }

  const bestStart = timeToMinutes(best.start);
  if (thermalStart > bestStart + 45) {
    return {
      start: best.start,
      end: best.end,
      label: `${best.label} / 늦은 써멀 시작 주의`,
      penalty: 6,
    };
  }

  return {
    start: best.start,
    end: best.end,
    label: best.label,
    penalty: 0,
  };
}

function selectCourse(siteId: string, score: number): CourseTemplate {
  const siteCourses = courseTemplates.filter((course) => course.siteId === siteId);
  if (score >= 80) {
    return (
      siteCourses.find((course) => course.courseType === "aggressive") ??
      siteCourses.find((course) => course.courseType === "standard") ??
      siteCourses[0]
    );
  }
  if (score >= 55) {
    return (
      siteCourses.find((course) => course.courseType === "standard") ??
      siteCourses[0]
    );
  }
  return (
    siteCourses.find((course) => course.courseType === "conservative") ??
    siteCourses[0]
  );
}

function createWarnings(
  site: SiteConfig,
  request: FlightBriefingRequest,
  windAlignmentScore: number
) {
  const warnings: WarningItem[] = [];
  const { weatherInput } = request;
  const dirMismatch =
    weatherInput.surfaceWindDir !== weatherInput.wind1200m.dir ||
    weatherInput.surfaceWindDir !== weatherInput.wind1500m.dir;

  if (weatherInput.rainProbabilityPct >= 40) {
    warnings.push({
      code: "RAIN_RISK",
      priority: "critical",
      title: "강수 리스크",
      message: "강수 가능성이 높아 보수적으로 판단해야 합니다.",
    });
  }

  if (windAlignmentScore === 0) {
    warnings.push({
      code: "BACKWIND_RISK",
      priority: "critical",
      title: "비추천 풍향",
      message: `${site.siteName} 이륙과 라인 유지에 불리한 풍향입니다.`,
    });
  }

  if (site.riskProfile.seaBreezeSensitive && weatherInput.wind1500m.speedKmh >= 24) {
    warnings.push({
      code: "SEA_BREEZE_RISK",
      priority: "critical",
      title: "해풍 개입 가능성",
      message: "오후 바람 전환으로 메인 코스 유지 확률이 크게 떨어질 수 있습니다.",
    });
  }

  if (site.riskProfile.windShiftSensitive && dirMismatch) {
    warnings.push({
      code: "WIND_SHIFT_RISK",
      priority: "high",
      title: "상하층 풍향 차이",
      message: "지상풍과 상층풍의 정렬이 완벽하지 않아 라인 판단이 까다롭습니다.",
    });
  }

  return warnings;
}

function evaluateSite(site: SiteConfig, request: FlightBriefingRequest): SiteEvaluation {
  const { weatherInput, pilotProfile } = request;
  const windAlignment = evaluateWindAlignment(site, weatherInput.surfaceWindDir);
  const surfaceScore = computeRangeScore(
    weatherInput.surfaceWindKmh,
    site.windThresholds.surfaceKmh,
    20
  );
  const upperWindScore = Math.round(
    (
      computeRangeScore(weatherInput.wind1200m.speedKmh, site.windThresholds.alt1200Kmh, 8) +
      computeRangeScore(weatherInput.wind1500m.speedKmh, site.windThresholds.alt1500Kmh, 7)
    )
  );
  const thermalScore = computeRangeScore(
    weatherInput.thermalMaxMs,
    site.thermalThresholds,
    15
  );
  const baseScore = weatherInput.baseM <= site.baseThresholdsM.rejectBelow
    ? 0
    : isInRange(weatherInput.baseM, site.baseThresholdsM.good)
      ? 10
      : isInRange(weatherInput.baseM, site.baseThresholdsM.caution)
        ? 6
        : 8;
  const weatherRiskScore = clamp(10 - Math.round(weatherInput.rainProbabilityPct / 10), 0, 10);

  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      factor: "wind_alignment",
      factorLabel: "풍향 적합도",
      score: windAlignment.score,
      maxScore: 25,
      reason: `${site.siteName} 기준 ${weatherInput.surfaceWindDir} 풍향을 반영했습니다.`,
    },
    {
      factor: "surface_wind",
      factorLabel: "지상풍 적합도",
      score: surfaceScore,
      maxScore: 20,
      reason: `지상풍 ${weatherInput.surfaceWindKmh}km/h 기준으로 평가했습니다.`,
    },
    {
      factor: "upper_wind",
      factorLabel: "상층풍 안정성",
      score: upperWindScore,
      maxScore: 15,
      reason: `1200m ${weatherInput.wind1200m.speedKmh} / 1500m ${weatherInput.wind1500m.speedKmh}km/h를 반영했습니다.`,
    },
    {
      factor: "thermal_strength",
      factorLabel: "써멀 강도",
      score: thermalScore,
      maxScore: 15,
      reason: `${weatherInput.thermalMaxMs.toFixed(1)}m/s 예상값을 반영했습니다.`,
    },
    {
      factor: "base_height",
      factorLabel: "베이스 높이",
      score: baseScore,
      maxScore: 10,
      reason: `예상 베이스 ${weatherInput.baseM}m 기준입니다.`,
    },
    {
      factor: "weather_risk",
      factorLabel: "강수 리스크",
      score: weatherRiskScore,
      maxScore: 10,
      reason: `강수 확률 ${weatherInput.rainProbabilityPct}% 기준입니다.`,
    },
  ];

  let score = scoreBreakdown.reduce((sum, item) => sum + item.score, 0);
  const launchWindow = resolveLaunchWindow(site, weatherInput.thermalStartTime);
  score -= launchWindow.penalty;

  for (const adjustment of site.scoreAdjustments) {
    if (adjustment.condition === "thermal >= 3.0" && weatherInput.thermalMaxMs >= 3) {
      score += adjustment.delta;
    }
    if (adjustment.condition === "base >= 2100" && weatherInput.baseM >= 2100) {
      score += adjustment.delta;
    }
    if (
      adjustment.condition === "after 13:00" &&
      timeToMinutes(launchWindow.end) >= timeToMinutes("13:00")
    ) {
      score += adjustment.delta;
    }
  }

  if (pilotProfile.level === "beginner_xc") {
    score -= 6;
  } else if (pilotProfile.level === "advanced_xc") {
    score += 4;
  }

  if (pilotProfile.safetyPreference === "safe") {
    score -= 4;
  } else if (pilotProfile.safetyPreference === "aggressive") {
    score += 3;
  }

  const warnings = createWarnings(site, request, windAlignment.score);
  score -= warnings.reduce((sum, item) => {
    if (item.priority === "critical") return sum + 10;
    if (item.priority === "high") return sum + 6;
    return sum + 3;
  }, 0);

  score = clamp(score, 0, 100);

  const grade: SiteRanking["grade"] =
    score >= 70 ? "mid_xc" : score >= 50 ? "short_xc" : score >= 30 ? "local_only" : "no_go";
  const recommendedCourse = selectCourse(site.siteId, score);
  const alternativeCourse =
    courseTemplates.find(
      (course) =>
        course.siteId === site.siteId && course.courseId !== recommendedCourse.courseId
    ) ?? recommendedCourse;

  return {
    site,
    score,
    grade,
    warnings,
    scoreBreakdown,
    recommendedCourse,
    alternativeCourse,
    launchWindow,
    highlight: warnings[0]?.title ?? windAlignment.highlight,
  };
}

export function generateBriefing(
  request: FlightBriefingRequest,
  siteWeatherInputs?: Partial<Record<string, FlightBriefingRequest["weatherInput"]>>
): FlightBriefingResponse {
  const preferenceSiteIds = new Set(request.preferenceSiteIds ?? []);
  const evaluations = siteConfigs
    .filter((site) => request.siteIds.includes(site.siteId))
    .map((site) =>
      evaluateSite(site, {
        ...request,
        weatherInput: siteWeatherInputs?.[site.siteId] ?? request.weatherInput,
      })
    )
    .sort((a, b) => {
      const scoreGap = Math.abs(b.score - a.score);

      if (scoreGap <= 5) {
        const aPrimary = request.primarySiteId === a.site.siteId ? 1 : 0;
        const bPrimary = request.primarySiteId === b.site.siteId ? 1 : 0;
        if (bPrimary !== aPrimary) {
          return bPrimary - aPrimary;
        }

        const aPreferred = preferenceSiteIds.has(a.site.siteId) ? 1 : 0;
        const bPreferred = preferenceSiteIds.has(b.site.siteId) ? 1 : 0;
        if (bPreferred !== aPreferred) {
          return bPreferred - aPreferred;
        }
      }

      return b.score - a.score;
    });

  const best = evaluations[0];
  const alternative = evaluations[1] ?? best;
  const recommendedCourse = best.recommendedCourse;
  const siteDetails = evaluations.map((evaluation) => {
    const recommendedPlan = buildPlanFromCourse(
      evaluation.site.siteId,
      evaluation.recommendedCourse,
      evaluation.launchWindow
    );
    const alternativePlan = {
      siteId: evaluation.site.siteId,
      courseId: evaluation.alternativeCourse.courseId,
      courseName: evaluation.alternativeCourse.name,
      courseType: evaluation.alternativeCourse.courseType,
      reason:
        evaluation.alternativeCourse.courseId === evaluation.recommendedCourse.courseId
          ? "현재 조건에서는 같은 코스를 유지하는 것이 가장 자연스럽습니다."
          : "같은 활공장 안에서 더 보수적이거나 다른 축의 대안 코스로 전환할 수 있습니다.",
    };

    return {
      siteId: evaluation.site.siteId,
      siteName: evaluation.site.siteName,
      score: evaluation.score,
      flightGrade: evaluation.grade,
      flightGradeLabel: gradeLabel(evaluation.grade),
      highlight: evaluation.highlight,
      recommendedLaunchWindow: evaluation.launchWindow,
      recommendedPlan,
      alternativePlan,
      warnings: evaluation.warnings,
      bottlenecks: buildBottlenecks(evaluation.recommendedCourse),
      scoreBreakdown: evaluation.scoreBreakdown,
      reasoning: [
        `${evaluation.site.siteName} 기준으로 현재 풍향과 풍속 조건을 반영했습니다.`,
        `${evaluation.recommendedCourse.name}이 현재 점수대에 가장 맞는 메인 코스입니다.`,
        alternativePlan.reason,
      ],
    };
  });

  return {
    requestId: `brief_${request.date.replaceAll("-", "")}_${best.site.siteId}`,
    date: request.date,
    summary: {
      bestSiteId: best.site.siteId,
      bestSiteName: best.site.siteName,
      flightGrade: best.grade,
      flightGradeLabel: gradeLabel(best.grade),
      score: best.score,
      recommendedLaunchWindow: best.launchWindow,
      oneLineBrief:
        best.grade === "no_go"
          ? `${best.site.siteName}도 오늘은 보수적으로 보면 비행 비추천입니다.`
          : `${best.site.siteName}이 가장 안정적이며 ${gradeLabel(best.grade)} 가능성이 높습니다.`,
    },
    siteRankings: evaluations.map((evaluation, index) => ({
      siteId: evaluation.site.siteId,
      siteName: evaluation.site.siteName,
      score: evaluation.score,
      grade: evaluation.grade,
      gradeLabel: gradeLabel(evaluation.grade),
      status:
        index === 0
          ? "recommended"
          : evaluation.grade === "no_go"
            ? "not_recommended"
            : evaluation.grade === "local_only"
              ? "caution"
              : "available",
      statusLabel:
        statusLabel(
          index === 0
            ? "recommended"
            : evaluation.grade === "no_go"
              ? "not_recommended"
              : evaluation.grade === "local_only"
                ? "caution"
                : "available"
        ),
      highlight: evaluation.highlight,
    })),
    recommendedPlan: {
      siteId: best.site.siteId,
      courseId: recommendedCourse.courseId,
      courseName: recommendedCourse.name,
      courseType: recommendedCourse.courseType,
      distanceKm: {
        expected: Math.round(
          (recommendedCourse.distanceKm.min + recommendedCourse.distanceKm.max) / 2
        ),
        min: recommendedCourse.distanceKm.min,
        max: recommendedCourse.distanceKm.max,
      },
      launchWindow: {
        start: best.launchWindow.start,
        end: best.launchWindow.end,
      },
      turnpoints: recommendedCourse.mapRoute.map((turnpoint, index) => ({
        order: index + 1,
        name: turnpoint.name,
        label: turnpoint.label,
        lat: turnpoint.lat,
        lng: turnpoint.lng,
      })),
    },
    alternativePlan: {
      siteId: alternative.site.siteId,
      courseId: alternative.alternativeCourse.courseId,
      courseName: alternative.alternativeCourse.name,
      courseType: alternative.alternativeCourse.courseType,
      reason:
        alternative.site.siteId === best.site.siteId
          ? "같은 지역 내 보수 코스로 전환해 리스크를 줄일 수 있습니다."
          : `${alternative.site.siteName}는 대안 지역으로 검토할 가치가 있습니다.`,
    },
    siteDetails,
    warnings: best.warnings,
    bottlenecks: buildBottlenecks(recommendedCourse),
    scoreBreakdown: best.scoreBreakdown,
    reasoning: [
      `${best.site.siteName}은 현재 풍향과 상층풍 조합이 가장 잘 맞습니다.`,
      `${recommendedCourse.name}을 기준으로 병목 구간을 관리하면 실사용 브리핑으로 충분합니다.`,
      alternative.site.siteId === best.site.siteId
        ? "같은 지역 내 보수 대안도 함께 유지하는 것이 안전합니다."
        : `${alternative.site.siteName}는 기상 변화 시 바로 전환할 수 있는 대안 지역입니다.`,
    ],
  };
}
