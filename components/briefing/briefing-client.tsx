"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefingDashboard } from "@/components/briefing/briefing-dashboard";
import { SelectedSiteBriefingPanel } from "@/components/briefing/selected-site-briefing-panel";
import { SiteWindRangePanel } from "@/components/briefing/site-wind-range-panel";
import { SelectedDateCard } from "@/components/cards/selected-date-card";
import { buildBriefingRequest } from "@/lib/request/build-briefing-request";
import type { SiteConfig } from "@/types/site";
import type { FlightBriefingResponse } from "@/types/briefing";

type BriefingClientProps = {
  searchParams: Record<string, string | string[] | undefined>;
  siteConfigs: SiteConfig[];
};

export function BriefingClient({ searchParams, siteConfigs }: BriefingClientProps) {
  const request = useMemo(() => buildBriefingRequest(searchParams), [searchParams]);
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
          throw new Error(payload.error ?? "브리핑 생성에 실패했습니다.");
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
        <p className="text-sm font-semibold text-stone-500">브리핑 생성 중</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">
          입력한 예보값으로 추천 지역을 계산하고 있습니다.
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          풍향, 풍속, 써멀, 베이스, 사용자 성향을 바탕으로 점수와 경고를 생성합니다.
        </p>
      </div>
    );
  }

  if (status === "error" || !briefing) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">브리핑 생성 실패</p>
        <p className="mt-2 text-base font-medium text-red-900">{error}</p>
      </div>
    );
  }

  const selectedSiteId =
    request.primarySiteId ??
    request.preferenceSiteIds?.[0] ??
    request.siteIds[0] ??
    briefing.summary.bestSiteId;
  const selectedSite =
    siteConfigs.find((site) => site.siteId === selectedSiteId) ?? null;
  const selectedSiteDebug = briefing.debug?.perSiteWeather.find(
    (site) => site.siteId === selectedSiteId
  );

  return (
    <div className="space-y-6">
      <SelectedDateCard
        date={request.date}
        label="브리핑 기준 날짜"
        tone="accent"
      />
      <div className="glass rounded-[28px] border p-5">
        <p className="text-sm font-semibold text-stone-500">입력 기준 요약</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">
          {request.dataSource === "open_meteo" ? "Open-Meteo 자동 예보" : "수동 입력 기반"} /{" "}
          {request.weatherInput.surfaceWindDir} {request.weatherInput.surfaceWindKmh}km/h / 써멀{" "}
          {request.weatherInput.thermalMaxMs}m/s
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          파일럿 레벨 {request.pilotProfile.level}, 목표 거리 {request.pilotProfile.targetDistanceKm}km,
          선택 지역 {request.siteIds.join(", ")} 기준으로 브리핑을 계산했습니다.
        </p>
      </div>
      <SelectedSiteBriefingPanel
        siteName={selectedSite?.siteName ?? selectedSiteDebug?.siteName ?? "선택 지역"}
        siteDebug={selectedSiteDebug}
      />
      <SiteWindRangePanel
        sites={selectedSite ? [selectedSite] : []}
        title="선택 지역 추천 풍향 범위"
        description="현재 선택한 활공장의 이륙장 기준 풍향 허용 범위를 원형으로 보여줍니다."
        actualDirections={{
          [selectedSiteId]: selectedSiteDebug?.weatherInput.surfaceWindDir,
        }}
      />
      <BriefingDashboard briefing={briefing} selectedSiteId={selectedSiteId} />
    </div>
  );
}
