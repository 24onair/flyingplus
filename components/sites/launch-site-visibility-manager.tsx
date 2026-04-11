"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LaunchSiteCatalogItem = {
  id: string;
  sourceName: string;
  normalizedName: string;
  lat: number;
  lng: number;
  altitudeM: number | null;
  windHint: string | null;
  regionLabel: string;
  visible: boolean;
};

export function LaunchSiteVisibilityManager({
  sites,
}: {
  sites: LaunchSiteCatalogItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [savingSiteId, setSavingSiteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const regionOptions = useMemo(() => {
    return ["전체", ...new Set(sites.map((site) => site.regionLabel))];
  }, [sites]);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesRegion =
        regionFilter === "전체" || site.regionLabel === regionFilter;
      const matchesQuery =
        !normalizedQuery ||
        site.sourceName.toLowerCase().includes(normalizedQuery) ||
        site.normalizedName.toLowerCase().includes(normalizedQuery);

      return matchesRegion && matchesQuery;
    });
  }, [query, regionFilter, sites]);

  async function handleToggle(siteId: string, visible: boolean) {
    setSavingSiteId(siteId);
    setMessage(null);

    try {
      const response = await fetch("/api/sites/catalog/visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteId, visible }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "저장 중 오류가 발생했습니다.");
      }

      setMessage(payload.message ?? "노출 설정을 저장했습니다.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "노출 설정 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSavingSiteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            전국 활공장 노출 관리
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              활공장 목록에 보여줄 원본 활공장을
              <br />
              직접 선택합니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              여기서 숨긴 활공장은 [활공장 목록] 페이지의 전국 원본 목록과 지도에서
              빠집니다.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-600">활공장 검색</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="문경, 간월재, 활공랜드..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-600">지역 필터</span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {regionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-[24px] border border-stone-200 bg-white/85 px-4 py-3 text-sm text-stone-600">
              <p className="font-semibold text-stone-900">현재 결과</p>
              <p className="mt-1 text-2xl font-bold text-sky-900">{filteredSites.length}개</p>
              <p className="mt-2 leading-6">
                표시 중 {filteredSites.filter((site) => site.visible).length}개
              </p>
            </div>
          </div>
          {message ? (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
              {message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredSites.map((site) => {
          const isSaving = savingSiteId === site.id;
          return (
            <article
              key={site.id}
              className={`rounded-[28px] border p-5 shadow-sm transition ${
                site.visible
                  ? "border-emerald-200 bg-[linear-gradient(180deg,#f4fff8_0%,#ebfff1_100%)]"
                  : "border-stone-200 bg-[rgba(255,252,246,0.92)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                      {site.regionLabel}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        site.visible
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {site.visible ? "표시 중" : "숨김"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">{site.sourceName}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {site.windHint ?? "풍향 메모 없음"}
                    </p>
                  </div>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm text-stone-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">좌표</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">고도</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {site.altitudeM ?? 0}m
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={isSaving || isPending || site.visible}
                  onClick={() => handleToggle(site.id, true)}
                  className="btn btn-accent"
                >
                  목록에 표시
                </button>
                <button
                  type="button"
                  disabled={isSaving || isPending || !site.visible}
                  onClick={() => handleToggle(site.id, false)}
                  className="btn btn-secondary"
                >
                  목록에서 숨기기
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
