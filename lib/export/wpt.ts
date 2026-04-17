import type { WaypointRecord } from "@/types/course";

type BuildWptParams = {
  waypoints: WaypointRecord[];
};

function mapSymbol(category: WaypointRecord["category"]) {
  switch (category) {
    case "launch":
      return 1;
    case "landing":
      return 5;
    case "reference":
      return 4;
    default:
      return 2;
  }
}

export function buildWptWaypointSetFile({ waypoints }: BuildWptParams) {
  const validWaypoints = waypoints.filter(
    (waypoint) =>
      typeof waypoint.lat === "number" &&
      typeof waypoint.lng === "number" &&
      Number.isFinite(waypoint.lat) &&
      Number.isFinite(waypoint.lng)
  );

  const header = [
    "OziExplorer Waypoint File Version 1.1",
    "WGS 84",
    "Reserved 2",
    "Reserved 3",
  ];

  const rows = validWaypoints.map((waypoint, index) => {
    const label = waypoint.label?.trim() || waypoint.name;
    const elevationM = Math.round(waypoint.elevationM ?? 0);

    return [
      index + 1,
      waypoint.code,
      waypoint.lat.toFixed(6),
      waypoint.lng.toFixed(6),
      "1",
      "1",
      mapSymbol(waypoint.category),
      "0",
      "65535",
      "",
      label,
      "0",
      "0",
      "0",
      elevationM,
      "6",
      "0",
      "17",
    ].join(",");
  });

  return `${[...header, ...rows].join("\n")}\n`;
}
