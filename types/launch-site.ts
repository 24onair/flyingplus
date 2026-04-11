export type KoreaLaunchSite = {
  id: string;
  sourceName: string;
  normalizedName: string;
  category: "launch_site";
  lat: number;
  lng: number;
  altitudeM: number | null;
  descriptionText: string;
  windHint: string | null;
  sourceLinks: string[];
  sourceFile: string;
};
