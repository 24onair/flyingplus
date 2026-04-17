import type { TaskPointType } from "@/types/course";

type WptTurnpoint = {
  order: number;
  name: string;
  label?: string;
  lat?: number;
  lng?: number;
  elevationM?: number;
  taskType: TaskPointType;
};

type BuildWptParams = {
  turnpoints: WptTurnpoint[];
};

function mapSymbol(taskType: TaskPointType) {
  switch (taskType) {
    case "start":
      return 1;
    case "goal":
      return 5;
    case "ess":
      return 4;
    case "sss":
      return 3;
    default:
      return 2;
  }
}

export function buildWptWaypointFile({ turnpoints }: BuildWptParams) {
  const validTurnpoints = turnpoints.filter(
    (
      turnpoint
    ): turnpoint is WptTurnpoint & {
      lat: number;
      lng: number;
    } => typeof turnpoint.lat === "number" && typeof turnpoint.lng === "number"
  );

  const header = [
    "OziExplorer Waypoint File Version 1.1",
    "WGS 84",
    "Reserved 2",
    "Reserved 3",
  ];

  const rows = validTurnpoints.map((turnpoint, index) => {
    const label = turnpoint.label?.trim() || turnpoint.name;
    const elevationM = Math.round(turnpoint.elevationM ?? 0);

    return [
      index + 1,
      turnpoint.name,
      turnpoint.lat.toFixed(6),
      turnpoint.lng.toFixed(6),
      "1",
      "1",
      mapSymbol(turnpoint.taskType),
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
