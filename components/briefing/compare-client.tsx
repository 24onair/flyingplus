"use client";

import { useEffect, useMemo, useState } from "react";
import { ComparisonBoard } from "@/components/briefing/comparison-board";
import { SiteWindRangePanel } from "@/components/briefing/site-wind-range-panel";
import { WeatherDebugCard } from "@/components/briefing/weather-debug-card";
import { SelectedDateCard } from "@/components/cards/selected-date-card";
import { buildBriefingRequest } from "@/lib/request/build-briefing-request";
import type { SiteConfig } from "@/types/site";
import type { FlightBriefingResponse } from "@/types/briefing";

type CompareClientProps = {
  searchParams: Record<string, string | string[] | undefined>;
  siteConfigs: SiteConfig[];
};

export function CompareClient({ searchParams, siteConfigs }: CompareClientProps) {
  const request = useMemo(
    () => ({
      ...buildBriefingRequest(searchParams),
      analysisMode: "same_time_compare" as const,
    }),
    [searchParams]
  );
  const [briefing, setBriefing] = useState<FlightBriefingResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      setError("");

      try {
        const response = await fetch("/api/briefings/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "지역 비교 생성에 실패했습니다.");
        }

        const payload = (await response.json()) as FlightBriefingResponse;
        if (!cancelled) {
          setBriefing(payload);
          setStatus("done");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "알 수 없는 오류");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [request]);

  if (status === "loading") {
    return (
      <div className="glass rounded-[28px] border p-6">
        <p className="text-sm font-semibold text-stone-500">지역 비교 생성 중</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">
          같은 입력값으로 3개 지역을 비교하고 있습니다.
        </h1>
      </div>
    );
  }

  if (status === "error" || !briefing) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">비교 생성 실패</p>
        <p className="mt-2 text-base font-medium text-red-900">{error}</p>
      </div>
    );
  }

  const actualDirections = Object.fromEntries(
    (briefing.debug?.perSiteWeather ?? []).map((site) => [
      site.siteId,
      site.weatherInput.surfaceWindDir,
    ])
  );

  return (
    <div className="space-y-6">
      <SelectedDateCard
        date={request.date}
        label="비교 기준 날짜"
        tone="accent"
      />

      <div className="glass rounded-[28px] border p-5">
        <p className="text-sm font-semibold text-stone-500">입력 기준 요약</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">
          {request.date} / {request.weatherInput.surfaceWindDir}{" "}
          {request.weatherInput.surfaceWindKmh}km/h / 써멀 {request.weatherInput.thermalMaxMs}m/s
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {request.dataSource === "open_meteo" ? "Open-Meteo 자동 예보" : "수동 입력"} 기준으로 문경,
          합천, 울산 고헌산을 동시에 평가한 결과입니다.
        </p>
      </div>
      <WeatherDebugCard debug={briefing.debug} />
      <SiteWindRangePanel
        sites={siteConfigs.filter((site) => request.siteIds.includes(site.siteId))}
        title="지역별 추천 풍향 범위"
        description="비교 중인 각 활공장의 이륙장 기준 풍향 허용 범위를 같은 형식으로 확인할 수 있습니다."
        actualDirections={actualDirections}
      />
      <ComparisonBoard rankings={briefing.siteRankings} />
    </div>
  );
}
