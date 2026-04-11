"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { windDirectionOptions } from "@/types/site-registration";

type ManageSiteListItem = {
  siteId: string;
  siteName: string;
  regionName: string;
  preferredWindDirections: string[];
};

export function ManageSiteSelector({
  sites,
  selectedSiteId,
}: {
  sites: ManageSiteListItem[];
  selectedSiteId: string;
}) {
  const router = useRouter();
  const [windFilter, setWindFilter] = useState("전체");

  const filteredSites = useMemo(() => {
    if (windFilter === "전체") {
      return sites;
    }

    return sites.filter((site) => site.preferredWindDirections.includes(windFilter));
  }, [sites, windFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-2">
          <span className="block text-sm font-semibold text-stone-600">풍향 필터</span>
          <select
            value={windFilter}
            onChange={(event) => setWindFilter(event.target.value)}
            className="min-w-[150px] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          >
            <option value="전체">전체</option>
            {windDirectionOptions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-stone-200 bg-white/85 px-4 py-3 text-sm text-stone-600">
          <p className="font-semibold text-stone-900">표시 활공장</p>
          <p className="mt-1 text-lg font-bold text-amber-900">{filteredSites.length}개</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredSites.map((site) => (
          <div
            key={site.siteId}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/sites/new?siteId=${site.siteId}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/sites/new?siteId=${site.siteId}`);
              }
            }}
            className={`block cursor-pointer rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
              site.siteId === selectedSiteId
                ? "border-amber-300 bg-amber-50"
                : "border-stone-200 bg-white/85"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-stone-900">{site.siteName}</p>
                <p className="mt-1 text-xs text-stone-500">{site.regionName}</p>
              </div>
              <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                등록 이동
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/sites/manage?siteId=${site.siteId}`}
                onClick={(event) => event.stopPropagation()}
                className={`btn text-xs ${
                  site.siteId === selectedSiteId ? "btn-primary" : "btn-secondary"
                }`}
              >
                관리에서 열기
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
