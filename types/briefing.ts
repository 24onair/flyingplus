import type { BottleneckType, CourseType } from "@/types/course";

export type WarningItem = {
  code: string;
  priority: "medium" | "high" | "critical";
  title: string;
  message: string;
};

export type BottleneckItem = {
  id: string;
  type: BottleneckType;
  severity: "medium" | "high" | "critical";
  name: string;
  message: string;
  location?: {
    lat: number;
    lng: number;
  };
};

export type ScoreBreakdownItem = {
  factor: string;
  factorLabel: string;
  score: number;
  maxScore: number;
  reason: string;
};

export type SiteRanking = {
  siteId: string;
  siteName: string;
  score: number;
  grade: "mid_xc" | "short_xc" | "local_only" | "no_go";
  gradeLabel: string;
  status: "recommended" | "available" | "caution" | "not_recommended";
  statusLabel: string;
  highlight: string;
};

export type FlightBriefingRequest = {
  date: string;
  siteIds: string[];
  preferenceSiteIds?: string[];
  primarySiteId?: string | null;
  dataSource?: "manual" | "open_meteo";
  analysisMode?: "site_optimal" | "same_time_compare";
  pilotProfile: {
    level: "beginner_xc" | "intermediate_xc" | "advanced_xc";
    safetyPreference: "safe" | "balanced" | "aggressive";
    targetDistanceKm: number;
    style: "thermal_xc" | "ridge_xc" | "mixed";
  };
  weatherInput: {
    surfaceWindDir: import("@/types/site").WindDirection;
    surfaceWindKmh: number;
    wind900m: {
      dir: import("@/types/site").WindDirection;
      speedKmh: number;
    };
    wind1200m: {
      dir: import("@/types/site").WindDirection;
      speedKmh: number;
    };
    wind1500m: {
      dir: import("@/types/site").WindDirection;
      speedKmh: number;
    };
    thermalMaxMs: number;
    thermalStartTime: string;
    baseM: number;
    cloudCoverPct: number;
    rainProbabilityPct: number;
  };
};

export type FlightBriefingResponse = {
  requestId: string;
  date: string;
  debug?: {
    hourlyTimeline?: Array<{
      time: string;
      surfaceWindDir: import("@/types/site").WindDirection;
      surfaceWindKmh: number;
      wind900mDir: import("@/types/site").WindDirection;
      wind900mKmh: number;
      wind1200mDir: import("@/types/site").WindDirection;
      wind1200mKmh: number;
      cloudCoverPct: number;
      rainProbabilityPct: number;
      thermalMaxMs: number;
      temperatureC?: number;
    }>;
    dataSource: "manual" | "open_meteo";
    requestedDate: string;
    selectedSiteIds: string[];
    comparisonMode: "site_optimal" | "same_time_compare";
    perSiteWeather: Array<{
      siteId: string;
      siteName: string;
      representativeTime?: string;
      comparisonTime?: string;
      activeTimeUsed?: string;
      sourceModel?: string;
      hourlyTimeline?: Array<{
        time: string;
        surfaceWindDir: import("@/types/site").WindDirection;
        surfaceWindKmh: number;
        wind900mDir: import("@/types/site").WindDirection;
        wind900mKmh: number;
        wind1200mDir: import("@/types/site").WindDirection;
        wind1200mKmh: number;
        cloudCoverPct: number;
        rainProbabilityPct: number;
        thermalMaxMs: number;
        temperatureC?: number;
      }>;
      weatherInput: FlightBriefingRequest["weatherInput"];
    }>;
  };
  summary: {
    bestSiteId: string;
    bestSiteName: string;
    flightGrade: "mid_xc" | "short_xc" | "local_only" | "no_go";
    flightGradeLabel: string;
    score: number;
    recommendedLaunchWindow: {
      start: string;
      end: string;
      label: string;
    };
    oneLineBrief: string;
  };
  siteRankings: SiteRanking[];
  recommendedPlan: {
    siteId: string;
    courseId: string;
    courseName: string;
    courseType: CourseType;
    distanceKm: {
      expected: number;
      min: number;
      max: number;
    };
    launchWindow: {
      start: string;
      end: string;
    };
    turnpoints: Array<{
      order: number;
      name: string;
      label?: string;
      lat?: number;
      lng?: number;
    }>;
  };
  alternativePlan: {
    siteId: string;
    courseId: string;
    courseName: string;
    courseType: CourseType;
    reason: string;
  };
  siteDetails: Array<{
    siteId: string;
    siteName: string;
    score: number;
    flightGrade: "mid_xc" | "short_xc" | "local_only" | "no_go";
    flightGradeLabel: string;
    highlight: string;
    recommendedLaunchWindow: {
      start: string;
      end: string;
      label: string;
    };
    recommendedPlan: {
      siteId: string;
      courseId: string;
      courseName: string;
      courseType: CourseType;
      distanceKm: {
        expected: number;
        min: number;
        max: number;
      };
      launchWindow: {
        start: string;
        end: string;
      };
      turnpoints: Array<{
        order: number;
        name: string;
        label?: string;
        lat?: number;
        lng?: number;
      }>;
    };
    alternativePlan: {
      siteId: string;
      courseId: string;
      courseName: string;
      courseType: CourseType;
      reason: string;
    };
    warnings: WarningItem[];
    bottlenecks: BottleneckItem[];
    scoreBreakdown: ScoreBreakdownItem[];
    reasoning: string[];
  }>;
  warnings: WarningItem[];
  bottlenecks: BottleneckItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  reasoning: string[];
};
