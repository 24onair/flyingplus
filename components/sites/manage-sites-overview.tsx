"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { ManageSiteListItem } from "@/types/manage-site";

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (token) {
  mapboxgl.accessToken = token;
}

function formatUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) {
    return "기본 설정 사용 중";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

export function ManageSitesOverview({
  sites,
  readOnly = false,
}: {
  sites: ManageSiteListItem[];
  readOnly?: boolean;
}) {
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  function selectSite(siteId: string) {
    setSelectedSiteId(siteId);
  }

  const selectedSite = useMemo(
    () => sites.find((site) => site.siteId === selectedSiteId) ?? null,
    [selectedSiteId, sites]
  );

  useEffect(() => {
    if (!selectedSiteId && sites[0]) {
      setSelectedSiteId(sites[0].siteId);
      return;
    }

    if (selectedSiteId && !sites.some((site) => site.siteId === selectedSiteId)) {
      setSelectedSiteId(sites[0]?.siteId ?? "");
    }
  }, [selectedSiteId, sites]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current || sites.length === 0) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [sites[0].launchLng, sites[0].launchLat],
      zoom: 7,
    });

    map.on("load", () => {
      if (!map.getSource("site-list-dem")) {
        map.addSource("site-list-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.setTerrain({
        source: "site-list-dem",
        exaggeration: 1.1,
      });
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    const bounds = new mapboxgl.LngLatBounds();

    sites.forEach((site) => {
      bounds.extend([site.launchLng, site.launchLat]);

      const el = document.createElement("button");
      el.type = "button";
      el.title = `${site.siteName} · ${site.launchName}`;
      el.className =
        "flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-stone-900 shadow-[0_6px_18px_rgba(28,25,23,0.35)]";
      el.innerHTML =
        '<span class="block h-2.5 w-2.5 rounded-full bg-amber-300 transition-transform duration-150 ease-out"></span>';

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([site.launchLng, site.launchLat])
        .addTo(map);

      el.addEventListener("click", () => {
        selectSite(site.siteId);
      });

      markerRefs.current[site.siteId] = marker;
    });

    map.fitBounds(bounds, {
      padding: 60,
      maxZoom: 9.5,
      duration: 600,
    });

    mapRef.current = map;

    return () => {
      Object.values(markerRefs.current).forEach((marker) => marker.remove());
      markerRefs.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, [sites]);

  useEffect(() => {
    sites.forEach((site) => {
      const marker = markerRefs.current[site.siteId];
      const element = marker?.getElement();
      const indicator = element?.firstElementChild as HTMLElement | null;

      if (!element || !indicator) {
        return;
      }

      element.style.background =
        site.siteId === selectedSiteId ? "#0f172a" : "#1c1917";
      element.style.boxShadow =
        site.siteId === selectedSiteId
          ? "0 10px 24px rgba(15, 23, 42, 0.38)"
          : "0 6px 18px rgba(28, 25, 23, 0.35)";
      indicator.style.transform =
        site.siteId === selectedSiteId ? "scale(1.45)" : "scale(1)";
      indicator.style.background =
        site.siteId === selectedSiteId ? "#fde68a" : "#fcd34d";
    });

    const selectedCard = cardRefs.current[selectedSiteId];
    selectedCard?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedSiteId, sites]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-stone-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
          <div>
            <p className="text-sm font-semibold text-stone-500">
              {readOnly ? "주요 활공장 위치" : "활공장 지도"}
            </p>
            <p className="text-sm text-stone-700">
              {readOnly
                ? "이륙장 마커를 클릭하면 아래 읽기 전용 상세 카드가 선택됩니다."
                : "이륙장 마커를 클릭하면 아래 목록에서 같은 활공장이 선택됩니다."}
            </p>
          </div>
          {selectedSite ? (
            <div className="text-right text-xs font-medium text-stone-500">
              <p className="font-semibold text-stone-800">{selectedSite.siteName}</p>
              <p>{selectedSite.launchName}</p>
              <p>
                {selectedSite.launchLat.toFixed(5)}, {selectedSite.launchLng.toFixed(5)}
              </p>
            </div>
          ) : null}
        </div>
        {token ? (
          <div
            ref={containerRef}
            className="h-[360px] overflow-hidden rounded-[22px]"
          />
        ) : (
          <div className="rounded-[22px] bg-stone-100 p-5 text-sm leading-6 text-stone-600">
            Mapbox 토큰이 없어서 지도는 숨기고 목록만 표시합니다.
          </div>
        )}
      </section>

      {readOnly && selectedSite ? (
        <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                읽기 전용 상세
              </div>
              <div>
                <h2 className="text-3xl font-bold text-stone-900">
                  {selectedSite.siteName}
                </h2>
                <p className="mt-1 text-sm font-medium text-stone-500">
                  {selectedSite.regionName}
                </p>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-stone-600">
                {selectedSite.tagline}
              </p>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-4 py-3 text-right text-sm text-stone-600">
              <p className="font-semibold text-stone-900">{selectedSite.launchName}</p>
              <p className="mt-1">
                {selectedSite.launchLat.toFixed(5)}, {selectedSite.launchLng.toFixed(5)}
              </p>
              <p className="mt-1">{selectedSite.launchElevationM}m</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-500">풍향</p>
              <p className="mt-3 text-lg font-semibold text-stone-900">
                {selectedSite.preferredWindDirections.length > 0
                  ? selectedSite.preferredWindDirections.join(", ")
                  : "입력 없음"}
              </p>
              <dl className="mt-5 space-y-3 text-sm text-stone-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">좌표</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {selectedSite.launchLat.toFixed(5)}, {selectedSite.launchLng.toFixed(5)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">고도</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {selectedSite.launchElevationM}m
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">웨이포인트</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {selectedSite.waypointFileName ?? "없음"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-500">외부 링크</p>
              {selectedSite.sourceLinks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSite.sourceLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-100"
                    >
                      {new URL(link).hostname.replace(/^www\./, "")}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">등록된 외부 링크가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-500">병목 메모</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                {selectedSite.routeNotes.bottleneckNotes || "입력 없음"}
              </p>
            </article>
            <article className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-500">회수 메모</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                {selectedSite.routeNotes.retrieveNotes || "입력 없음"}
              </p>
            </article>
            <article className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-500">운영 메모</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                {selectedSite.routeNotes.operationsNotes || "입력 없음"}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <article
            key={site.siteId}
            ref={(element) => {
              cardRefs.current[site.siteId] = element;
            }}
            onClick={() => selectSite(site.siteId)}
            className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm transition duration-200 ${
              site.siteId === selectedSiteId
                ? "border-amber-500 bg-[linear-gradient(180deg,#fff7e8_0%,#ffefcf_100%)] shadow-[0_20px_44px_rgba(180,83,9,0.16)] ring-2 ring-amber-400/35"
                : "glass border-stone-200 bg-[rgba(255,252,246,0.92)]"
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1.5 transition ${
                site.siteId === selectedSiteId ? "bg-amber-500" : "bg-transparent"
              }`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                  {site.hasOverride ? "사용자 저장값 있음" : "기본 설정"}
                </div>
                <div>
                  <h2
                    className={`text-2xl font-bold ${
                      site.siteId === selectedSiteId ? "text-stone-950" : "text-stone-900"
                    }`}
                  >
                    {site.siteName}
                  </h2>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      site.siteId === selectedSiteId
                        ? "text-amber-900"
                        : "text-stone-500"
                    }`}
                  >
                    {site.regionName}
                  </p>
                </div>
              </div>
            </div>

            <p
              className={`mt-4 text-sm leading-6 ${
                site.siteId === selectedSiteId ? "text-stone-800" : "text-stone-600"
              }`}
            >
              {site.tagline}
            </p>

            <dl className="mt-5 space-y-3 text-sm text-stone-600">
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-stone-500">마지막 수정</dt>
                <dd className="text-right font-medium text-stone-900">
                  {formatUpdatedAt(site.updatedAt)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-stone-500">대표 이륙장</dt>
                <dd className="text-right font-medium text-stone-900">
                  {site.launchName}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-stone-500">풍향</dt>
                <dd className="text-right font-medium text-stone-900">
                  {site.preferredWindDirections.length > 0
                    ? site.preferredWindDirections.join(", ")
                    : "입력 없음"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-stone-500">웨이포인트</dt>
                <dd className="text-right font-medium text-stone-900">
                  {site.waypointFileName ?? "없음"}
                </dd>
              </div>
            </dl>

            {readOnly ? (
              <div className="mt-6 rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-600">
                카드를 선택하면 지도 위치와 입력된 운영 정보를 읽기 전용으로 볼 수 있습니다.
              </div>
            ) : (
              <div className="mt-6">
                <Link
                  href={`/sites/manage?siteId=${site.siteId}`}
                  className="btn btn-secondary"
                >
                  이 활공장 관리하기
                </Link>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
