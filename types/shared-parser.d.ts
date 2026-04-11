declare module "@/lib/igc/shared-parser.mjs" {
  export type ParsedFix = {
    type: "fix";
    time: string;
    lat: number | null;
    lon: number | null;
    validity: string;
    pressureAltitudeM: number | null;
    gpsAltitudeM: number | null;
  };

  export type ParsedTaskPoint = {
    type: "task-point";
    lat: number | null;
    lon: number | null;
    name: string | null;
    radiusM: number | null;
    elevationM: number | null;
    zoneLat: number | null;
    zoneLon: number | null;
  };

  export type ParsedPhaseEvent = {
    phase: string;
    time: string | null;
  };

  export type ParsedFlightSummary = {
    pilot: string | null;
    glider: string | null;
    recorder: string | null;
    date: string | null;
    timezone: string | null;
    fixCount: number;
    taskCount: number;
    phaseEventCount: number;
    distanceKm: number;
    durationSeconds: number | null;
    gpsAltitudeMinM: number | null;
    gpsAltitudeMaxM: number | null;
    pressureAltitudeMinM: number | null;
    pressureAltitudeMaxM: number | null;
    takeoff: {
      time: string;
      lat: number | null;
      lon: number | null;
      gpsAltitudeM: number | null;
    } | null;
    landing: {
      time: string;
      lat: number | null;
      lon: number | null;
      gpsAltitudeM: number | null;
    } | null;
  };

  export type ParsedIgcFlight = {
    header: {
      pilot: string | null;
      glider: string | null;
      recorder: string | null;
      date: string | null;
      timezone: string | null;
    };
    fixes: ParsedFix[];
    task: ParsedTaskPoint[];
    phaseEvents: ParsedPhaseEvent[];
    taskMetadata: string[];
    summary: ParsedFlightSummary | null;
  };

  export function buildFlightSummary(parsed: ParsedIgcFlight): ParsedFlightSummary;
  export function parseIgcText(text: string): ParsedIgcFlight;
  export function parseIgcFile(filePath: string): ParsedIgcFlight;
  export function parseTimeToSeconds(value: string | null | undefined): number | null;
  export function haversineDistanceKm(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number },
  ): number;
}
