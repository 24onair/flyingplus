import type { SiteConfig, WindDirection } from "@/types/site";
import type { FlightBriefingRequest } from "@/types/briefing";
import type {
  OpenMeteoForecastResponse,
  OpenMeteoHourlyResponse,
} from "@/lib/open-meteo/types";
import { average, averageWindDirection, clamp, timeToMinutes } from "@/lib/engine/helpers";

export function degreeToWindDirection(degree: number): WindDirection {
  const directions: WindDirection[] = [
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
  ];
  const index = Math.round((((degree % 360) + 360) % 360) / 22.5) % 16;
  return directions[index];
}

function inferThermalStrength(cape: number, radiation: number, cloudCover: number, precipitation: number) {
  return Number(
    clamp(1.0 + cape / 180 + radiation / 450 - cloudCover / 120 - precipitation * 1.5, 0.8, 5.8).toFixed(1)
  );
}

function inferRainProbability(precipitation: number) {
  if (precipitation >= 2) return 90;
  if (precipitation >= 1) return 75;
  if (precipitation >= 0.3) return 45;
  if (precipitation > 0) return 20;
  return 5;
}

function inferCloudBaseMsl(
  launchElevationM: number,
  temperatureC: number,
  dewPointC: number
) {
  const agl = Math.max(300, 125 * (temperatureC - dewPointC));
  return Math.round(launchElevationM + agl);
}

function hourlyPotentialScore(hourly: OpenMeteoHourlyResponse, index: number) {
  return (
    hourly.cape[index] * 0.08 +
    hourly.shortwave_radiation[index] * 0.015 -
    hourly.cloud_cover[index] * 0.12 -
    hourly.precipitation[index] * 18
  );
}

export function chooseRepresentativeHour(hourly: OpenMeteoHourlyResponse) {
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < hourly.time.length; index += 1) {
    const hourText = hourly.time[index]?.slice(11, 16) ?? "00:00";
    const minutes = timeToMinutes(hourText);

    if (minutes < timeToMinutes("10:00") || minutes > timeToMinutes("16:00")) {
      continue;
    }

    const score = hourlyPotentialScore(hourly, index);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function inferThermalStartTime(hourly: OpenMeteoHourlyResponse) {
  for (let index = 0; index < hourly.time.length; index += 1) {
    const hourText = hourly.time[index]?.slice(11, 16) ?? "00:00";
    const minutes = timeToMinutes(hourText);

    if (
      minutes >= timeToMinutes("09:00") &&
      hourly.shortwave_radiation[index] >= 250 &&
      hourly.cape[index] >= 60 &&
      hourly.precipitation[index] < 0.4
    ) {
      return hourText;
    }
  }

  return "11:00";
}

export function getRepresentativeAnalysisTime(hourly: OpenMeteoHourlyResponse) {
  const index = chooseRepresentativeHour(hourly);
  return hourly.time[index]?.slice(11, 16) ?? "11:00";
}

export function chooseSharedComparisonHour(
  hourlySeries: OpenMeteoHourlyResponse[]
) {
  if (hourlySeries.length === 0) {
    return 0;
  }

  const reference = hourlySeries[0];
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < reference.time.length; index += 1) {
    const hourText = reference.time[index]?.slice(11, 16) ?? "00:00";
    const minutes = timeToMinutes(hourText);

    if (minutes < timeToMinutes("10:00") || minutes > timeToMinutes("16:00")) {
      continue;
    }

    const combinedScore =
      hourlySeries.reduce((sum, hourly) => sum + hourlyPotentialScore(hourly, index), 0) /
      hourlySeries.length;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function getTimeAtIndex(hourly: OpenMeteoHourlyResponse, index: number) {
  return hourly.time[index]?.slice(11, 16) ?? "11:00";
}

export function mapOpenMeteoToWeatherInput(
  site: SiteConfig,
  forecast: OpenMeteoForecastResponse
): FlightBriefingRequest["weatherInput"] {
  const hourly = forecast.hourly;
  const index = chooseRepresentativeHour(hourly);
  return mapOpenMeteoToWeatherInputAtIndex(site, forecast, index);
}

export function mapOpenMeteoToWeatherInputAtIndex(
  site: SiteConfig,
  forecast: OpenMeteoForecastResponse,
  index: number
): FlightBriefingRequest["weatherInput"] {
  const hourly = forecast.hourly;

  const surfaceDirDeg = hourly.wind_direction_10m[index];
  const p925DirDeg = hourly.wind_direction_925hPa[index];
  const p850DirDeg = hourly.wind_direction_850hPa[index];
  const interpolated1200Dir = averageWindDirection([p925DirDeg, p850DirDeg]);
  const interpolated1200Speed = average([
    hourly.wind_speed_925hPa[index],
    hourly.wind_speed_850hPa[index],
  ]);

  return {
    surfaceWindDir: degreeToWindDirection(surfaceDirDeg),
    surfaceWindKmh: Math.round(hourly.wind_speed_10m[index]),
    wind900m: {
      dir: degreeToWindDirection(p925DirDeg),
      speedKmh: Math.round(hourly.wind_speed_925hPa[index]),
    },
    wind1200m: {
      dir: degreeToWindDirection(interpolated1200Dir),
      speedKmh: Math.round(interpolated1200Speed),
    },
    wind1500m: {
      dir: degreeToWindDirection(p850DirDeg),
      speedKmh: Math.round(hourly.wind_speed_850hPa[index]),
    },
    thermalMaxMs: inferThermalStrength(
      hourly.cape[index],
      hourly.shortwave_radiation[index],
      hourly.cloud_cover[index],
      hourly.precipitation[index]
    ),
    thermalStartTime: inferThermalStartTime(hourly),
    baseM: inferCloudBaseMsl(
      site.launch.elevationM,
      hourly.temperature_2m[index],
      hourly.dew_point_2m[index]
    ),
    cloudCoverPct: Math.round(hourly.cloud_cover[index]),
    rainProbabilityPct: inferRainProbability(hourly.precipitation[index]),
  };
}

export function mapOpenMeteoHourlyTimeline(
  site: SiteConfig,
  forecast: OpenMeteoForecastResponse
) {
  const hourly = forecast.hourly;

  return hourly.time
    .map((time, index) => {
      const hourText = time?.slice(11, 16) ?? "00:00";
      const p925DirDeg = hourly.wind_direction_925hPa[index];
      const p850DirDeg = hourly.wind_direction_850hPa[index];
      const interpolated1200Dir = averageWindDirection([p925DirDeg, p850DirDeg]);
      const interpolated1200Speed = average([
        hourly.wind_speed_925hPa[index],
        hourly.wind_speed_850hPa[index],
      ]);

      return {
        time: hourText,
        surfaceWindDir: degreeToWindDirection(hourly.wind_direction_10m[index]),
        surfaceWindKmh: Math.round(hourly.wind_speed_10m[index]),
        wind900mDir: degreeToWindDirection(p925DirDeg),
        wind900mKmh: Math.round(hourly.wind_speed_925hPa[index]),
        wind1200mDir: degreeToWindDirection(interpolated1200Dir),
        wind1200mKmh: Math.round(interpolated1200Speed),
        cloudCoverPct: Math.round(hourly.cloud_cover[index]),
        rainProbabilityPct: inferRainProbability(hourly.precipitation[index]),
        thermalMaxMs: inferThermalStrength(
          hourly.cape[index],
          hourly.shortwave_radiation[index],
          hourly.cloud_cover[index],
          hourly.precipitation[index]
        ),
        temperatureC: Math.round(hourly.temperature_2m[index]),
      };
    })
    .filter((entry) => {
      const minutes = timeToMinutes(entry.time);
      return (
        minutes >= timeToMinutes("05:00") && minutes <= timeToMinutes("19:00")
      );
    });
}

export async function fetchOpenMeteoForecast(site: SiteConfig, date: string) {
  const endpoint = new URL("https://api.open-meteo.com/v1/ecmwf");
  endpoint.searchParams.set("latitude", String(site.launch.lat));
  endpoint.searchParams.set("longitude", String(site.launch.lng));
  endpoint.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "dew_point_2m",
      "precipitation",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_speed_925hPa",
      "wind_direction_925hPa",
      "wind_speed_850hPa",
      "wind_direction_850hPa",
      "geopotential_height_850hPa",
      "cape",
      "shortwave_radiation",
    ].join(",")
  );
  endpoint.searchParams.set("wind_speed_unit", "kmh");
  endpoint.searchParams.set("timezone", "Asia/Seoul");
  endpoint.searchParams.set("start_date", date);
  endpoint.searchParams.set("end_date", date);

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo 요청 실패: ${response.status}`);
  }

  return (await response.json()) as OpenMeteoForecastResponse;
}
