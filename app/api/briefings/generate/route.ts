import { NextResponse } from "next/server";
import { generateBriefing } from "@/lib/engine/generate-briefing";
import {
  chooseSharedComparisonHour,
  fetchOpenMeteoForecast,
  getTimeAtIndex,
  getRepresentativeAnalysisTime,
  mapOpenMeteoHourlyTimeline,
  mapOpenMeteoToWeatherInputAtIndex,
  mapOpenMeteoToWeatherInput,
} from "@/lib/open-meteo/client";
import { flightBriefingRequestSchema } from "@/lib/schemas/briefing";
import { getRuntimeSiteConfigs } from "@/lib/sites/runtime-site-configs";

export async function POST(request: Request) {
  try {
    const siteConfigs = await getRuntimeSiteConfigs();
    const body = (await request.json()) as unknown;
    const parsed = flightBriefingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "입력값 검증에 실패했습니다.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    if (parsed.data.dataSource === "open_meteo") {
      try {
        const selectedSites = siteConfigs.filter((site) =>
          parsed.data.siteIds.includes(site.siteId)
        );

        const siteForecastEntries = await Promise.all(
          selectedSites.map(async (site) => {
            const forecast = await fetchOpenMeteoForecast(site, parsed.data.date);
            return [
              site.siteId,
              {
                site,
                forecast,
                siteId: site.siteId,
                siteName: site.siteName,
                representativeTime: getRepresentativeAnalysisTime(forecast.hourly),
              },
            ] as const;
          })
        );

        const sharedComparisonIndex =
          parsed.data.analysisMode === "same_time_compare"
            ? chooseSharedComparisonHour(
                siteForecastEntries.map(([, item]) => item.forecast.hourly)
              )
            : null;

        const siteWeatherEntries = siteForecastEntries.map(([siteId, item]) => {
          const weatherInput =
            sharedComparisonIndex === null
              ? mapOpenMeteoToWeatherInput(item.site, item.forecast)
              : mapOpenMeteoToWeatherInputAtIndex(
                  item.site,
                  item.forecast,
                  sharedComparisonIndex
                );

          return [
            siteId,
            {
              siteId: item.siteId,
              siteName: item.siteName,
              representativeTime: item.representativeTime,
              comparisonTime:
                sharedComparisonIndex === null
                  ? undefined
                  : getTimeAtIndex(item.forecast.hourly, sharedComparisonIndex),
              activeTimeUsed:
                sharedComparisonIndex === null
                  ? item.representativeTime
                  : getTimeAtIndex(item.forecast.hourly, sharedComparisonIndex),
              sourceModel: "Open-Meteo ECMWF",
              hourlyTimeline: mapOpenMeteoHourlyTimeline(item.site, item.forecast),
              weatherInput,
            },
          ] as const;
        });

        const briefing = generateBriefing(
          parsed.data,
          Object.fromEntries(
            siteWeatherEntries.map(([siteId, item]) => [siteId, item.weatherInput])
          )
        );

        return NextResponse.json({
          ...briefing,
          debug: {
            dataSource: "open_meteo",
            requestedDate: parsed.data.date,
            selectedSiteIds: parsed.data.siteIds,
            comparisonMode:
              parsed.data.analysisMode === "same_time_compare"
                ? "same_time_compare"
                : "site_optimal",
            perSiteWeather: siteWeatherEntries.map(([, item]) => item),
          },
        });
      } catch {
        const briefing = generateBriefing(parsed.data);
        return NextResponse.json({
          ...briefing,
          debug: {
            dataSource: "manual",
            requestedDate: parsed.data.date,
            selectedSiteIds: parsed.data.siteIds,
            comparisonMode:
              parsed.data.analysisMode === "same_time_compare"
                ? "same_time_compare"
                : "site_optimal",
            perSiteWeather: siteConfigs
              .filter((site) => parsed.data.siteIds.includes(site.siteId))
              .map((site) => ({
                siteId: site.siteId,
                siteName: site.siteName,
                activeTimeUsed: "Open-Meteo 실패, 입력값 폴백",
                weatherInput: parsed.data.weatherInput,
              })),
          },
        });
      }
    }

    const briefing = generateBriefing(parsed.data);
    return NextResponse.json({
      ...briefing,
      debug: {
        dataSource: "manual",
        requestedDate: parsed.data.date,
        selectedSiteIds: parsed.data.siteIds,
        comparisonMode: "site_optimal",
        perSiteWeather: siteConfigs
          .filter((site) => parsed.data.siteIds.includes(site.siteId))
          .map((site) => ({
            siteId: site.siteId,
            siteName: site.siteName,
            activeTimeUsed: "수동 입력",
            weatherInput: parsed.data.weatherInput,
          })),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "브리핑 생성 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
