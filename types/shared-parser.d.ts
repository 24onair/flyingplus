declare module "@/lib/igc/shared-parser.mjs" {
  export function buildFlightSummary(parsed: any): any;
  export function parseIgcText(text: string): any;
  export function parseIgcFile(filePath: string): any;
  export function parseTimeToSeconds(value: string | null | undefined): number | null;
  export function haversineDistanceKm(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number },
  ): number;
}
