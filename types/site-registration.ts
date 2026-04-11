import type {
  LaunchWindow,
  RangeBand,
  RegionType,
  SiteConfig,
  SiteSummary,
  WindDirection,
} from "@/types/site";

export const windDirectionOptions: WindDirection[] = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export const regionTypeOptions: Array<{ value: RegionType; label: string }> = [
  { value: "inland_mountain", label: "내륙 산악형" },
  { value: "long_distance", label: "장거리 확장형" },
  { value: "coastal_risk", label: "해풍 민감형" },
];

export type LaunchWindowDraft = LaunchWindow;

export type LandingZoneDraft = {
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
};

export type WaypointUploadDraft = {
  fileName: string;
  fileType: "wpt" | "cup" | "gpx" | "kml" | "csv";
};

export type NewSiteRegistrationDraft = {
  siteId: string;
  siteName: string;
  regionName: string;
  tagline: string;
  regionType: RegionType;
  launch: {
    name: string;
    lat: number;
    lng: number;
    elevationM: number;
  };
  primaryLanding: LandingZoneDraft;
  preferredWind: SiteConfig["preferredWind"];
  windThresholds: SiteConfig["windThresholds"];
  thermalThresholds: RangeBand;
  baseThresholdsM: SiteConfig["baseThresholdsM"];
  launchWindows: LaunchWindowDraft[];
  riskProfile: SiteConfig["riskProfile"];
  scoreAdjustments: SiteConfig["scoreAdjustments"];
  waypointUpload: WaypointUploadDraft;
  routeNotes: {
    bottleneckNotes: string;
    retrieveNotes: string;
    operationsNotes: string;
  };
};

export type NewSiteRegistrationPreview = {
  summary: SiteSummary;
  config: SiteConfig;
  metadata: {
    regionName: string;
    primaryLanding: LandingZoneDraft;
    waypointUpload: WaypointUploadDraft;
    routeNotes: NewSiteRegistrationDraft["routeNotes"];
  };
};
