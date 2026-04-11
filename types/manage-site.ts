export type ManageSiteListItem = {
  siteId: string;
  siteName: string;
  regionName: string;
  tagline: string;
  launchName: string;
  launchLat: number;
  launchLng: number;
  launchElevationM: number;
  preferredWindDirections: string[];
  waypointFileName: string | null;
  routeNotes: {
    bottleneckNotes: string;
    retrieveNotes: string;
    operationsNotes: string;
  };
  sourceLinks: string[];
  hasOverride: boolean;
  updatedAt: string | null;
};
