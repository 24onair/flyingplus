import type { FlightBriefingRequest } from "@/types/briefing";
import type { WindDirection } from "@/types/site";

export function getDefaultBriefingDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function firstValue(
  value: string | string[] | undefined,
  fallback: string
) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export function buildBriefingRequest(
  searchParams: Record<string, string | string[] | undefined>
): FlightBriefingRequest {
  const defaultDate = getDefaultBriefingDate();
  const siteIdsParam = firstValue(
    searchParams.siteIds,
    "mungyeong,hapcheon,goheonsan"
  );
  const preferenceSiteIdsParam = firstValue(searchParams.preferenceSiteIds, "");
  const primarySiteId = firstValue(searchParams.primarySiteId, "");

  return {
    date: firstValue(searchParams.date, defaultDate),
    siteIds: siteIdsParam.split(",").filter(Boolean),
    preferenceSiteIds: preferenceSiteIdsParam.split(",").filter(Boolean),
    primarySiteId: primarySiteId || null,
    dataSource: firstValue(searchParams.dataSource, "open_meteo") as
      | "manual"
      | "open_meteo",
    analysisMode: firstValue(
      searchParams.analysisMode,
      "site_optimal"
    ) as FlightBriefingRequest["analysisMode"],
    pilotProfile: {
      level: firstValue(
        searchParams.level,
        "intermediate_xc"
      ) as FlightBriefingRequest["pilotProfile"]["level"],
      safetyPreference: firstValue(
        searchParams.safetyPreference,
        "balanced"
      ) as FlightBriefingRequest["pilotProfile"]["safetyPreference"],
      targetDistanceKm: Number(firstValue(searchParams.targetDistanceKm, "35")),
      style: firstValue(
        searchParams.style,
        "thermal_xc"
      ) as FlightBriefingRequest["pilotProfile"]["style"],
    },
    weatherInput: {
      surfaceWindDir: firstValue(searchParams.surfaceWindDir, "W") as WindDirection,
      surfaceWindKmh: Number(firstValue(searchParams.surfaceWindKmh, "14")),
      wind900m: {
        dir: firstValue(searchParams.wind900Dir, "WNW") as WindDirection,
        speedKmh: Number(firstValue(searchParams.wind900Kmh, "18")),
      },
      wind1200m: {
        dir: firstValue(searchParams.wind1200Dir, "WNW") as WindDirection,
        speedKmh: Number(firstValue(searchParams.wind1200Kmh, "22")),
      },
      wind1500m: {
        dir: firstValue(searchParams.wind1500Dir, "NW") as WindDirection,
        speedKmh: Number(firstValue(searchParams.wind1500Kmh, "24")),
      },
      thermalMaxMs: Number(firstValue(searchParams.thermalMaxMs, "3.4")),
      thermalStartTime: firstValue(searchParams.thermalStartTime, "11:05"),
      baseM: Number(firstValue(searchParams.baseM, "2050")),
      cloudCoverPct: Number(firstValue(searchParams.cloudCoverPct, "35")),
      rainProbabilityPct: Number(firstValue(searchParams.rainProbabilityPct, "10")),
    },
  };
}
