import type { FlightBriefingRequest } from "@/types/briefing";

export const mockRequests: Record<string, FlightBriefingRequest> = {
  hapcheonBest: {
    date: "2026-04-05",
    siteIds: ["mungyeong", "hapcheon", "goheonsan"],
    pilotProfile: {
      level: "intermediate_xc",
      safetyPreference: "balanced",
      targetDistanceKm: 35,
      style: "thermal_xc",
    },
    weatherInput: {
      surfaceWindDir: "W",
      surfaceWindKmh: 14,
      wind900m: { dir: "WNW", speedKmh: 18 },
      wind1200m: { dir: "WNW", speedKmh: 22 },
      wind1500m: { dir: "NW", speedKmh: 24 },
      thermalMaxMs: 3.4,
      thermalStartTime: "11:05",
      baseM: 2050,
      cloudCoverPct: 35,
      rainProbabilityPct: 10,
    },
  },
  goheonsanRejected: {
    date: "2026-04-05",
    siteIds: ["mungyeong", "hapcheon", "goheonsan"],
    pilotProfile: {
      level: "intermediate_xc",
      safetyPreference: "safe",
      targetDistanceKm: 20,
      style: "thermal_xc",
    },
    weatherInput: {
      surfaceWindDir: "E",
      surfaceWindKmh: 11,
      wind900m: { dir: "ESE", speedKmh: 18 },
      wind1200m: { dir: "SE", speedKmh: 24 },
      wind1500m: { dir: "SE", speedKmh: 27 },
      thermalMaxMs: 2.3,
      thermalStartTime: "11:40",
      baseM: 1720,
      cloudCoverPct: 55,
      rainProbabilityPct: 18,
    },
  },
};
