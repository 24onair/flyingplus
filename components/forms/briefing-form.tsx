"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { SelectedDateCard } from "@/components/cards/selected-date-card";
import { SiteSelectorCard } from "@/components/cards/site-selector-card";
import { getDefaultBriefingDate } from "@/lib/request/build-briefing-request";
import type { FlightBriefingRequest } from "@/types/briefing";
import type { SiteSummary } from "@/types/site";

export function BriefingForm({
  sites,
  initialRequest,
}: {
  sites: SiteSummary[];
  initialRequest: FlightBriefingRequest;
}) {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, getAccessToken } = useAuth();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialRequest.date);
  const [favoriteSiteIds, setFavoriteSiteIds] = useState<string[]>([]);
  const defaultDate = getDefaultBriefingDate();

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (authLoading) {
        return;
      }

      if (!user || !canUsePersonalStorage(profile)) {
        setFavoriteSiteIds([]);
        return;
      }

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          return;
        }

        const response = await fetch("/api/favorites/sites", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as {
          siteIds?: string[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "선호 활공장 조회 실패");
        }

        if (!cancelled) {
          setFavoriteSiteIds(payload.siteIds ?? []);
        }
      } catch {
        if (!cancelled) {
          setFavoriteSiteIds([]);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [authLoading, getAccessToken, profile, user]);

  function handleSubmit(formData: FormData) {
    const siteIds = formData.getAll("siteIds").map(String);

    if (siteIds.length === 0) {
      setError("최소 1개 지역은 선택해야 합니다.");
      return;
    }

    const params = new URLSearchParams({
      date: String(formData.get("date") ?? defaultDate),
      dataSource: "open_meteo",
      level: String(formData.get("level") ?? "intermediate_xc"),
      safetyPreference: String(formData.get("safetyPreference") ?? "balanced"),
      targetDistanceKm: String(formData.get("targetDistanceKm") ?? 35),
      style: String(formData.get("style") ?? "thermal_xc"),
      surfaceWindDir: String(formData.get("surfaceWindDir") ?? "W"),
      surfaceWindKmh: String(formData.get("surfaceWindKmh") ?? 14),
      wind900Dir: String(formData.get("wind900Dir") ?? "WNW"),
      wind900Kmh: String(formData.get("wind900Kmh") ?? 18),
      wind1200Dir: String(formData.get("wind1200Dir") ?? "WNW"),
      wind1200Kmh: String(formData.get("wind1200Kmh") ?? 22),
      wind1500Dir: String(formData.get("wind1500Dir") ?? "NW"),
      wind1500Kmh: String(formData.get("wind1500Kmh") ?? 24),
      thermalMaxMs: String(formData.get("thermalMaxMs") ?? 3.4),
      thermalStartTime: String(formData.get("thermalStartTime") ?? "11:05"),
      baseM: String(formData.get("baseM") ?? 2050),
      cloudCoverPct: String(formData.get("cloudCoverPct") ?? 35),
      rainProbabilityPct: String(formData.get("rainProbabilityPct") ?? 10),
      siteIds: siteIds.join(","),
    });
    const preferenceSiteIds = favoriteSiteIds.filter((siteId) => siteIds.includes(siteId));
    if (preferenceSiteIds.length > 0) {
      params.set("preferenceSiteIds", preferenceSiteIds.join(","));
    }
    if (profile?.primarySiteId) {
      params.set("primarySiteId", profile.primarySiteId);
    }

    const destination = String(formData.get("destination") ?? "briefing");
    params.set(
      "analysisMode",
      destination === "compare" ? "same_time_compare" : "site_optimal"
    );
    router.push(`/${destination}?${params.toString()}`);
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-stone-700">날짜</span>
        <input
          name="date"
          type="date"
          defaultValue={initialRequest.date}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
        />
      </label>

      <SelectedDateCard
        date={selectedDate}
        label="이번 분석 날짜"
        tone="accent"
      />

      <div className="space-y-2">
        <span className="block text-sm font-medium text-stone-700">대표 지역</span>
        {user && canUsePersonalStorage(profile) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            선호 활공장과 즐겨찾기 정보가 실제 추천 우선순위에 반영됩니다.
          </div>
        ) : null}
        {sites.map((site) => (
          <SiteSelectorCard
            key={site.siteId}
            site={site}
            defaultChecked={initialRequest.siteIds.includes(site.siteId)}
            preferred={
              favoriteSiteIds.includes(site.siteId) || profile?.primarySiteId === site.siteId
            }
          />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">파일럿 레벨</span>
          <select
            name="level"
            defaultValue={initialRequest.pilotProfile.level}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
          >
            <option value="beginner_xc">입문 XC</option>
            <option value="intermediate_xc">중급 XC</option>
            <option value="advanced_xc">상급 XC</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">안전 성향</span>
          <select
            name="safetyPreference"
            defaultValue={initialRequest.pilotProfile.safetyPreference}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
          >
            <option value="safe">안전 우선</option>
            <option value="balanced">균형형</option>
            <option value="aggressive">공격형</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">목표 거리 km</span>
          <input
            name="targetDistanceKm"
            type="number"
            min="5"
            defaultValue={initialRequest.pilotProfile.targetDistanceKm}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">비행 스타일</span>
          <select
            name="style"
            defaultValue={initialRequest.pilotProfile.style}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
          >
            <option value="thermal_xc">써멀 중심</option>
            <option value="ridge_xc">리지 중심</option>
            <option value="mixed">혼합형</option>
          </select>
        </label>
      </div>

      <input name="dataSource" type="hidden" value="open_meteo" />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-900">데이터 소스</p>
        <p className="mt-1 text-sm text-emerald-800">Open-Meteo 자동 예보 고정</p>
      </div>

      <div className="rounded-3xl bg-stone-100 p-4">
        <p className="mb-3 text-sm font-semibold text-stone-700">핵심 예보 입력</p>
        <p className="mb-4 text-xs leading-5 text-stone-500">
          홈에서는 `Open-Meteo 자동 예보`를 기본으로 사용합니다. 아래 값은 비교용 기준 입력으로
          유지되며, 실제 분석에는 선택한 지역 좌표 기준 자동 예보가 우선 사용됩니다.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">지상 풍향</span>
            <select name="surfaceWindDir" defaultValue={initialRequest.weatherInput.surfaceWindDir} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900">
              {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"].map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">지상 풍속 km/h</span>
            <input name="surfaceWindKmh" type="number" step="1" defaultValue={initialRequest.weatherInput.surfaceWindKmh} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">900m 풍향</span>
            <select name="wind900Dir" defaultValue={initialRequest.weatherInput.wind900m.dir} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900">
              {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"].map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">900m 풍속 km/h</span>
            <input name="wind900Kmh" type="number" step="1" defaultValue={initialRequest.weatherInput.wind900m.speedKmh} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">1200m 풍향</span>
            <select name="wind1200Dir" defaultValue={initialRequest.weatherInput.wind1200m.dir} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900">
              {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"].map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">1200m 풍속 km/h</span>
            <input name="wind1200Kmh" type="number" step="1" defaultValue={initialRequest.weatherInput.wind1200m.speedKmh} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">1500m 풍향</span>
            <select name="wind1500Dir" defaultValue={initialRequest.weatherInput.wind1500m.dir} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900">
              {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"].map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">1500m 풍속 km/h</span>
            <input name="wind1500Kmh" type="number" step="1" defaultValue={initialRequest.weatherInput.wind1500m.speedKmh} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">써멀 최대 m/s</span>
            <input name="thermalMaxMs" type="number" step="0.1" defaultValue={initialRequest.weatherInput.thermalMaxMs} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">써멀 시작 시간</span>
            <input name="thermalStartTime" type="time" defaultValue={initialRequest.weatherInput.thermalStartTime} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">예상 베이스 m</span>
            <input name="baseM" type="number" step="10" defaultValue={initialRequest.weatherInput.baseM} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-stone-700">구름량 %</span>
            <input name="cloudCoverPct" type="number" step="1" defaultValue={initialRequest.weatherInput.cloudCoverPct} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-stone-700">강수 확률 %</span>
            <input name="rainProbabilityPct" type="number" step="1" defaultValue={initialRequest.weatherInput.rainProbabilityPct} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900" />
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="submit"
          name="destination"
          value="briefing"
          className="btn btn-accent w-full rounded-2xl"
        >
          실제 브리핑 생성
        </button>
        <button
          type="submit"
          name="destination"
          value="compare"
          className="btn btn-secondary w-full rounded-2xl"
        >
          실제 지역 비교
        </button>
        <button
          type="submit"
          name="destination"
          value="courses"
          className="btn btn-primary w-full rounded-2xl"
        >
          실제 코스 보기
        </button>
      </div>
    </form>
  );
}
