export type CourseType = "conservative" | "standard" | "aggressive";

export type WaypointCategory =
  | "launch"
  | "turnpoint"
  | "landing"
  | "reference";

export type TaskPointType = "start" | "sss" | "turnpoint" | "ess" | "goal";

export type MapPoint = {
  name: string;
  label?: string;
  lat: number;
  lng: number;
};

export type WaypointRecord = MapPoint & {
  siteId: string;
  code: string;
  elevationM: number;
  category: WaypointCategory;
  source: string;
};

export type BottleneckType =
  | "VALLEY-CROSS"
  | "LOW-SAVE"
  | "WIND-SHIFT"
  | "SEA-BREEZE"
  | "GLIDE-GAP"
  | "LANDING-LIMIT"
  | "RETRIEVE-HARD";

export type CourseTemplate = {
  courseId: string;
  siteId: string;
  name: string;
  courseType: CourseType;
  axis: string;
  distanceKm: {
    min: number;
    max: number;
  };
  recommendedLevels: string[];
  turnpoints: string[];
  mapRoute: MapPoint[];
  goalCandidates: Array<{
    name: string;
    retrieveScore: "good" | "medium" | "low";
  }>;
  bottlenecks: Array<{
    id: string;
    name: string;
    type: BottleneckType;
    severity: "medium" | "high" | "critical";
    description: string;
    location: {
      lat: number;
      lng: number;
    };
  }>;
  notes: string[];
};
