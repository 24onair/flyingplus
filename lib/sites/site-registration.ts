import { siteSummaries } from "@/data/sites/config";
import { detectLaunchSiteRegion } from "@/lib/sites/launch-site-region";
import { extractLaunchSiteWindHint } from "@/lib/sites/launch-site-wind";
import type { SiteConfig } from "@/types/site";
import type { NewSiteRegistrationDraft } from "@/types/site-registration";
import type { KoreaLaunchSite } from "@/types/launch-site";

export const defaultNewSiteDraft: NewSiteRegistrationDraft = {
  siteId: "new-site",
  siteName: "신규 활공장",
  regionName: "신규 지역",
  tagline: "운영 검토 중인 XC 활공장",
  regionType: "inland_mountain",
  launch: {
    name: "대표 이륙장",
    lat: 36.7311,
    lng: 128.17437,
    elevationM: 920,
  },
  primaryLanding: {
    name: "대표 랜딩장",
    lat: 36.737,
    lng: 128.15417,
    elevationM: 230,
  },
  preferredWind: {
    best: ["WNW", "NW"],
    conditional: ["W", "NNW"],
    caution: ["SW", "NE"],
    reject: ["E", "SE", "S"],
  },
  windThresholds: {
    surfaceKmh: {
      good: [10, 18],
      caution: [
        [7, 9],
        [19, 22],
      ],
      rejectBelow: 6,
      rejectAbove: 23,
    },
    alt900Kmh: {
      good: [14, 24],
      caution: [
        [10, 13],
        [25, 28],
      ],
      rejectBelow: 9,
      rejectAbove: 29,
    },
    alt1200Kmh: {
      good: [16, 26],
      caution: [
        [12, 15],
        [27, 31],
      ],
      rejectBelow: 11,
      rejectAbove: 32,
    },
    alt1500Kmh: {
      good: [18, 28],
      caution: [
        [14, 17],
        [29, 34],
      ],
      rejectBelow: 13,
      rejectAbove: 35,
    },
  },
  thermalThresholds: {
    good: [2.5, 4],
    caution: [
      [1.8, 2.4],
      [4.1, 4.8],
    ],
    rejectBelow: 1.7,
    rejectAbove: 5,
  },
  baseThresholdsM: {
    good: [1800, 2300],
    caution: [1600, 1799],
    rejectBelow: 1599,
  },
  launchWindows: [
    {
      start: "10:30",
      end: "11:30",
      grade: "conditional",
      label: "로컬 상승 체크 후 출발",
    },
    {
      start: "11:30",
      end: "13:30",
      grade: "main",
      label: "XC 출발 핵심 시간대",
    },
    {
      start: "13:30",
      end: "15:00",
      grade: "late",
      label: "상층풍 변화 체크",
    },
  ],
  riskProfile: {
    seaBreezeSensitive: false,
    windShiftSensitive: false,
    valleyCrossSensitive: true,
    lateStartPenalty: false,
  },
  scoreAdjustments: [
    {
      ruleId: "NEW-01",
      condition: "thermal >= 3.0",
      delta: 4,
      reason: "써멀 가산",
    },
  ],
  waypointUpload: {
    fileName: "new-site-waypoints.wpt",
    fileType: "wpt",
  },
  routeNotes: {
    bottleneckNotes: "주 계곡 횡단 구간과 바람 전환 구간을 나중에 보강",
    retrieveNotes: "대표 랜딩장 회수는 양호하나 북측은 차량 회수 확인 필요",
    operationsNotes: "초기 등록 후 실제 운영 수치와 파일럿 피드백으로 보정 필요",
  },
};

export function createDraftFromSiteConfig(site: SiteConfig): NewSiteRegistrationDraft {
  const summary = siteSummaries.find((item) => item.siteId === site.siteId);

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    regionName: summary?.name ?? site.siteName,
    tagline: summary?.tagline ?? `${site.siteName} 운영 설정`,
    regionType: site.regionType,
    launch: { ...site.launch },
    primaryLanding: {
      name: `${site.siteName} 대표 랜딩장`,
      lat: site.launch.lat,
      lng: site.launch.lng,
      elevationM: Math.max(0, site.launch.elevationM - 500),
    },
    preferredWind: {
      best: [...site.preferredWind.best],
      conditional: [...site.preferredWind.conditional],
      caution: [...site.preferredWind.caution],
      reject: [...site.preferredWind.reject],
    },
    windThresholds: structuredClone(site.windThresholds),
    thermalThresholds: structuredClone(site.thermalThresholds),
    baseThresholdsM: structuredClone(site.baseThresholdsM),
    launchWindows: structuredClone(site.launchWindows),
    riskProfile: structuredClone(site.riskProfile),
    scoreAdjustments: structuredClone(site.scoreAdjustments),
    waypointUpload: {
      fileName: `${site.siteId}-waypoints.wpt`,
      fileType: "wpt",
    },
    routeNotes: {
      bottleneckNotes: `${site.siteName} 병목 구간 메모를 여기에 보강`,
      retrieveNotes: `${site.siteName} 회수 메모를 여기에 보강`,
      operationsNotes: `${site.siteName} 운영 메모를 여기에 보강`,
    },
  };
}

function slugifySiteId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "new-site";
}

function regionTypeFromLaunchSite(site: KoreaLaunchSite) {
  const text = `${site.sourceName} ${site.descriptionText}`.toLowerCase();
  const regionLabel = detectLaunchSiteRegion(site);

  if (
    text.includes("해수욕장") ||
    text.includes("해변") ||
    text.includes("방파제") ||
    text.includes("가덕도") ||
    text.includes("거제도") ||
    regionLabel === "제주"
  ) {
    return "coastal_risk";
  }

  if (
    text.includes("장거리") ||
    text.includes("활공랜드") ||
    text.includes("고수부지")
  ) {
    return "long_distance";
  }

  return "inland_mountain";
}

function extractBestWindDirections(site: KoreaLaunchSite): NewSiteRegistrationDraft["preferredWind"]["best"] {
  const hint = site.windHint ?? extractLaunchSiteWindHint(site.descriptionText) ?? "";
  const mappings: Array<[RegExp, NewSiteRegistrationDraft["preferredWind"]["best"][number]]> = [
    [/북북동|NNE/u, "NNE"],
    [/북동|NE/u, "NE"],
    [/동북동|ENE/u, "ENE"],
    [/동풍|[^남북]동/u, "E"],
    [/동남동|ESE/u, "ESE"],
    [/남동|SE/u, "SE"],
    [/남남동|SSE/u, "SSE"],
    [/남풍|[^동서]남/u, "S"],
    [/남남서|SSW/u, "SSW"],
    [/남서|SW/u, "SW"],
    [/서남서|WSW/u, "WSW"],
    [/서풍|[^남북]서/u, "W"],
    [/서북서|WNW/u, "WNW"],
    [/북서|NW/u, "NW"],
    [/북북서|NNW/u, "NNW"],
    [/북풍|[^남동서]북/u, "N"],
  ];

  const result = mappings
    .filter(([pattern]) => pattern.test(hint))
    .map(([, direction]) => direction);

  return Array.from(new Set(result)).slice(0, 4);
}

export function createDraftFromLaunchSite(site: KoreaLaunchSite): NewSiteRegistrationDraft {
  const draft = structuredClone(defaultNewSiteDraft);
  const bestDirections = extractBestWindDirections(site);

  return {
    ...draft,
    siteId: slugifySiteId(site.normalizedName),
    siteName: site.sourceName,
    regionName: detectLaunchSiteRegion(site),
    tagline: site.descriptionText.slice(0, 60) || `${site.sourceName} 등록 초안`,
    regionType: regionTypeFromLaunchSite(site),
    launch: {
      name: site.sourceName,
      lat: site.lat,
      lng: site.lng,
      elevationM: site.altitudeM && site.altitudeM > 0 ? site.altitudeM : draft.launch.elevationM,
    },
    primaryLanding: {
      ...draft.primaryLanding,
      name: `${site.sourceName} 대표 랜딩장`,
      lat: site.lat,
      lng: site.lng,
      elevationM:
        site.altitudeM && site.altitudeM > 300
          ? Math.max(0, site.altitudeM - 300)
          : draft.primaryLanding.elevationM,
    },
    preferredWind: {
      ...draft.preferredWind,
      best: bestDirections.length > 0 ? bestDirections : draft.preferredWind.best,
    },
    routeNotes: {
      ...draft.routeNotes,
      operationsNotes: site.descriptionText || draft.routeNotes.operationsNotes,
    },
  };
}
