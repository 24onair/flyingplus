export type WindDirection =
  | "N"
  | "NNE"
  | "NE"
  | "ENE"
  | "E"
  | "ESE"
  | "SE"
  | "SSE"
  | "S"
  | "SSW"
  | "SW"
  | "WSW"
  | "W"
  | "WNW"
  | "NW"
  | "NNW";

export type RegionType = "inland_mountain" | "long_distance" | "coastal_risk";

export type ScoreAdjustment = {
  ruleId: string;
  condition: string;
  delta: number;
  reason: string;
};

export type RangeBand = {
  good: [number, number];
  caution: [[number, number], [number, number]];
  rejectBelow: number;
  rejectAbove: number;
};

export type LaunchWindow = {
  start: string;
  end: string;
  grade: "conditional" | "main" | "late";
  label: string;
};

export type SiteConfig = {
  siteId: string;
  siteName: string;
  regionType: RegionType;
  launch: {
    name: string;
    lat: number;
    lng: number;
    elevationM: number;
  };
  preferredWind: {
    best: WindDirection[];
    conditional: WindDirection[];
    caution: WindDirection[];
    reject: WindDirection[];
  };
  windThresholds: {
    surfaceKmh: RangeBand;
    alt900Kmh: RangeBand;
    alt1200Kmh: RangeBand;
    alt1500Kmh: RangeBand;
  };
  thermalThresholds: RangeBand;
  baseThresholdsM: {
    good: [number, number];
    caution: [number, number];
    rejectBelow: number;
  };
  launchWindows: LaunchWindow[];
  scoreAdjustments: ScoreAdjustment[];
  riskProfile: {
    seaBreezeSensitive: boolean;
    windShiftSensitive: boolean;
    valleyCrossSensitive: boolean;
    lateStartPenalty: boolean;
  };
};

export type SiteSummary = {
  siteId: string;
  name: string;
  tagline: string;
};
