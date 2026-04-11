import type { TaskPointType, WaypointRecord } from "@/types/course";

export type CupTurnpoint = {
  order: number;
  name: string;
  label?: string;
  lat?: number;
  lng?: number;
  radiusM: number;
  taskType: TaskPointType;
};

type BuildCupTaskParams = {
  taskName: string;
  taskDistanceKm: number;
  turnpoints: CupTurnpoint[];
  waypointDatabase: WaypointRecord[];
};

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function toCupLatitude(lat: number) {
  const hemisphere = lat >= 0 ? "N" : "S";
  const absolute = Math.abs(lat);
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  return `${String(degrees).padStart(2, "0")}${minutes.toFixed(3).padStart(6, "0")}${hemisphere}`;
}

function toCupLongitude(lng: number) {
  const hemisphere = lng >= 0 ? "E" : "W";
  const absolute = Math.abs(lng);
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  return `${String(degrees).padStart(3, "0")}${minutes.toFixed(3).padStart(6, "0")}${hemisphere}`;
}

function formatWaypointRow(waypoint: WaypointRecord) {
  return [
    escapeCsv(waypoint.label || waypoint.name),
    waypoint.code,
    "",
    toCupLatitude(waypoint.lat),
    toCupLongitude(waypoint.lng),
    `${waypoint.elevationM.toFixed(1)}m`,
    "1",
    "",
    "0.0m",
    "",
    "",
    "",
    "",
    '""',
  ].join(",");
}

function buildTaskHeader(taskName: string, taskDistanceKm: number, turnpoints: CupTurnpoint[]) {
  const title = `${taskName} - ${taskDistanceKm.toFixed(1)}`;
  const names = turnpoints.map((turnpoint) => turnpoint.label || turnpoint.name);
  return [escapeCsv(title), '"???"', ...names.map(escapeCsv), '"???"'].join(",");
}

function buildObsZoneRow(index: number, turnpoint: CupTurnpoint) {
  const style =
    turnpoint.taskType === "start"
      ? 2
      : turnpoint.taskType === "goal"
        ? 3
        : 1;
  const extras: string[] = [];

  if (turnpoint.taskType === "turnpoint" && index === 1) {
    extras.push("SpeedStyle=0");
  }

  if (turnpoint.taskType === "ess") {
    extras.push("SpeedStyle=2");
  }

  return [
    `ObsZone=${index}`,
    `Style=${style}`,
    `R1=${Math.round(turnpoint.radiusM)}m`,
    "A1=180",
    ...extras,
  ].join(",");
}

export function buildCupTaskFile({
  taskName,
  taskDistanceKm,
  turnpoints,
  waypointDatabase,
}: BuildCupTaskParams) {
  const validTurnpoints = turnpoints.filter(
    (
      turnpoint
    ): turnpoint is CupTurnpoint & {
      lat: number;
      lng: number;
    } => typeof turnpoint.lat === "number" && typeof turnpoint.lng === "number"
  );

  const uniqueCodes = new Set(validTurnpoints.map((turnpoint) => turnpoint.name));
  const exportWaypoints =
    waypointDatabase.length > 0
      ? waypointDatabase
      : validTurnpoints.map((turnpoint) => ({
          siteId: "custom",
          code: turnpoint.name,
          name: turnpoint.name,
          label: turnpoint.label,
          lat: turnpoint.lat,
          lng: turnpoint.lng,
          elevationM: 0,
          category: "turnpoint" as const,
          source: "custom",
        }));

  const taskRows = [
    buildTaskHeader(taskName, taskDistanceKm, validTurnpoints),
    "Options,Short=true,StartOnEntry=false,GateInterval=15,GateIntSec=900,GateCount=1,MultiStart=false",
    ...validTurnpoints.map((turnpoint, index) =>
      buildObsZoneRow(index, turnpoint)
    ),
  ];

  const lines = [
    "name,code,country,lat,lon,elev,style,rwdir,rwlen,rwwidth,freq,desc,userdata,pics",
    ...exportWaypoints.map(formatWaypointRow),
    "-----Related Tasks-----",
    ...taskRows,
  ];

  if (uniqueCodes.size === 0) {
    return lines.join("\n");
  }

  return `${lines.join("\n")}\n`;
}
