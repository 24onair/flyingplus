import { z } from "zod";

const windDirections = [
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
] as const;

export const flightBriefingRequestSchema = z.object({
  date: z.string().min(1),
  siteIds: z.array(z.string()).min(1),
  preferenceSiteIds: z.array(z.string()).optional(),
  primarySiteId: z.string().nullable().optional(),
  dataSource: z.enum(["manual", "open_meteo"]).optional(),
  analysisMode: z.enum(["site_optimal", "same_time_compare"]).optional(),
  pilotProfile: z.object({
    level: z.enum(["beginner_xc", "intermediate_xc", "advanced_xc"]),
    safetyPreference: z.enum(["safe", "balanced", "aggressive"]),
    targetDistanceKm: z.number().min(1).max(300),
    style: z.enum(["thermal_xc", "ridge_xc", "mixed"]),
  }),
  weatherInput: z.object({
    surfaceWindDir: z.enum(windDirections),
    surfaceWindKmh: z.number().min(0).max(100),
    wind900m: z.object({
      dir: z.enum(windDirections),
      speedKmh: z.number().min(0).max(100),
    }),
    wind1200m: z.object({
      dir: z.enum(windDirections),
      speedKmh: z.number().min(0).max(100),
    }),
    wind1500m: z.object({
      dir: z.enum(windDirections),
      speedKmh: z.number().min(0).max(100),
    }),
    thermalMaxMs: z.number().min(0).max(10),
    thermalStartTime: z.string().min(4),
    baseM: z.number().min(500).max(5000),
    cloudCoverPct: z.number().min(0).max(100),
    rainProbabilityPct: z.number().min(0).max(100),
  }),
});
