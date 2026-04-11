import type { SiteConfig, SiteSummary } from "@/types/site";

export const siteSummaries: SiteSummary[] = [
  { siteId: "mungyeong", name: "문경", tagline: "내륙 산악형 XC" },
  { siteId: "hapcheon", name: "합천", tagline: "장거리 확장형 XC" },
  { siteId: "goheonsan", name: "울산 고헌산", tagline: "바람 전환 민감형 XC" },
];

export const siteConfigs: SiteConfig[] = [
  {
    siteId: "mungyeong",
    siteName: "문경",
    regionType: "inland_mountain",
    launch: {
      name: "문경 대표 이륙장",
      lat: 36.731101,
      lng: 128.174374,
      elevationM: 920,
    },
    preferredWind: {
      best: ["WNW", "NW", "NNW"],
      conditional: ["W", "N"],
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
      { start: "10:30", end: "11:30", grade: "conditional", label: "로컬 상승 체크 후 출발" },
      { start: "11:30", end: "13:30", grade: "main", label: "XC 출발 핵심 시간대" },
      { start: "13:30", end: "15:00", grade: "late", label: "상층풍 강화 여부 확인 필요" },
    ],
    scoreAdjustments: [
      {
        ruleId: "MG-01",
        condition: "thermal >= 3.0",
        delta: 4,
        reason: "써멀 가산",
      },
    ],
    riskProfile: {
      seaBreezeSensitive: false,
      windShiftSensitive: false,
      valleyCrossSensitive: true,
      lateStartPenalty: false,
    },
  },
  {
    siteId: "hapcheon",
    siteName: "합천",
    regionType: "long_distance",
    launch: {
      name: "합천 대표 이륙장",
      lat: 35.566,
      lng: 128.165,
      elevationM: 820,
    },
    preferredWind: {
      best: ["W", "WNW", "NW"],
      conditional: ["SW", "NNW"],
      caution: ["N", "SSW"],
      reject: ["E", "SE", "S"],
    },
    windThresholds: {
      surfaceKmh: {
        good: [9, 17],
        caution: [
          [6, 8],
          [18, 21],
        ],
        rejectBelow: 5,
        rejectAbove: 22,
      },
      alt900Kmh: {
        good: [13, 23],
        caution: [
          [10, 12],
          [24, 27],
        ],
        rejectBelow: 9,
        rejectAbove: 28,
      },
      alt1200Kmh: {
        good: [15, 25],
        caution: [
          [11, 14],
          [26, 30],
        ],
        rejectBelow: 10,
        rejectAbove: 31,
      },
      alt1500Kmh: {
        good: [17, 27],
        caution: [
          [13, 16],
          [28, 33],
        ],
        rejectBelow: 12,
        rejectAbove: 34,
      },
    },
    thermalThresholds: {
      good: [2.7, 4.2],
      caution: [
        [2, 2.6],
        [4.3, 5],
      ],
      rejectBelow: 1.9,
      rejectAbove: 5.3,
    },
    baseThresholdsM: {
      good: [1900, 2400],
      caution: [1700, 1899],
      rejectBelow: 1699,
    },
    launchWindows: [
      { start: "10:30", end: "11:30", grade: "conditional", label: "로컬 및 첫 연결 확인 단계" },
      { start: "11:30", end: "14:00", grade: "main", label: "XC 확장에 유리한 시간대" },
      { start: "14:00", end: "15:30", grade: "late", label: "바람 변화와 회수 방향 확인" },
    ],
    scoreAdjustments: [
      {
        ruleId: "HC-01",
        condition: "base >= 2100",
        delta: 5,
        reason: "장거리 확장 가산",
      },
    ],
    riskProfile: {
      seaBreezeSensitive: false,
      windShiftSensitive: true,
      valleyCrossSensitive: true,
      lateStartPenalty: true,
    },
  },
  {
    siteId: "goheonsan",
    siteName: "울산 고헌산",
    regionType: "coastal_risk",
    launch: {
      name: "고헌산 대표 이륙장",
      lat: 35.655,
      lng: 129.042,
      elevationM: 960,
    },
    preferredWind: {
      best: ["WNW", "NW", "W"],
      conditional: ["NNW", "SW"],
      caution: ["N", "S"],
      reject: ["E", "ENE", "ESE", "SE"],
    },
    windThresholds: {
      surfaceKmh: {
        good: [8, 15],
        caution: [
          [6, 7],
          [16, 18],
        ],
        rejectBelow: 5,
        rejectAbove: 19,
      },
      alt900Kmh: {
        good: [12, 20],
        caution: [
          [9, 11],
          [21, 24],
        ],
        rejectBelow: 8,
        rejectAbove: 25,
      },
      alt1200Kmh: {
        good: [14, 22],
        caution: [
          [10, 13],
          [23, 26],
        ],
        rejectBelow: 9,
        rejectAbove: 27,
      },
      alt1500Kmh: {
        good: [16, 24],
        caution: [
          [12, 15],
          [25, 29],
        ],
        rejectBelow: 11,
        rejectAbove: 30,
      },
    },
    thermalThresholds: {
      good: [2.3, 3.8],
      caution: [
        [1.8, 2.2],
        [3.9, 4.5],
      ],
      rejectBelow: 1.7,
      rejectAbove: 4.8,
    },
    baseThresholdsM: {
      good: [1700, 2200],
      caution: [1500, 1699],
      rejectBelow: 1499,
    },
    launchWindows: [
      { start: "10:30", end: "11:15", grade: "conditional", label: "초기 판단 구간" },
      { start: "11:15", end: "13:00", grade: "main", label: "가장 안정적인 XC 출발 후보" },
      { start: "13:00", end: "14:00", grade: "late", label: "해풍/전환 리스크 확대 가능" },
    ],
    scoreAdjustments: [
      {
        ruleId: "GH-01",
        condition: "after 13:00",
        delta: -6,
        reason: "늦은 출발 감점",
      },
    ],
    riskProfile: {
      seaBreezeSensitive: true,
      windShiftSensitive: true,
      valleyCrossSensitive: false,
      lateStartPenalty: true,
    },
  },
];

export function getSiteConfigById(siteId: string) {
  return siteConfigs.find((site) => site.siteId === siteId) ?? null;
}
