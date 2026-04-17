"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { buildWptWaypointSetFile } from "@/lib/export/wpt";
import type { WaypointRecord } from "@/types/course";
import type { ManageSiteListItem } from "@/types/manage-site";

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (token) {
  mapboxgl.accessToken = token;
}

type WaypointExportPageProps = {
  sites: ManageSiteListItem[];
  initialSiteId: string;
};

type BoundsLike = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function downloadFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function waypointMarkerColor(waypoint: WaypointRecord) {
  switch (waypoint.category) {
    case "launch":
      return "#2563eb";
    case "landing":
      return "#16a34a";
    case "reference":
      return "#78716c";
    default:
      return waypoint.source === "map-added" ? "#ea580c" : "#7c3aed";
  }
}

function containsBounds(bounds: BoundsLike | null, waypoint: WaypointRecord) {
  if (!bounds) {
    return true;
  }

  return (
    waypoint.lng >= bounds.west &&
    waypoint.lng <= bounds.east &&
    waypoint.lat >= bounds.south &&
    waypoint.lat <= bounds.north
  );
}

function sanitizeWaypointCode(value: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);

  return cleaned || "ADD-WP";
}

function ensureUniqueCode(
  waypoints: WaypointRecord[],
  preferred: string,
  currentIndex: number
) {
  const baseCode = sanitizeWaypointCode(preferred);
  const existingCodes = new Set(
    waypoints
      .filter((_, index) => index !== currentIndex)
      .map((waypoint) => waypoint.code.toUpperCase())
  );

  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }

  let sequence = 2;
  while (sequence < 1000) {
    const suffix = `-${sequence}`;
    const candidate = `${baseCode.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`;
    if (!existingCodes.has(candidate.toUpperCase())) {
      return candidate;
    }
    sequence += 1;
  }

  return `${baseCode.slice(0, 12)}-${Date.now().toString().slice(-3)}`;
}

function createCustomWaypoint(
  siteId: string,
  index: number,
  lat: number,
  lng: number
): WaypointRecord {
  const sequence = String(index + 1).padStart(2, "0");
  const code = `ADD${sequence}`;
  return {
    siteId,
    code,
    name: code,
    label: `추가 포인트 ${index + 1}`,
    lat,
    lng,
    elevationM: 0,
    category: "turnpoint",
    source: "map-added",
  };
}

export function WaypointExportPage({
  sites,
  initialSiteId,
}: WaypointExportPageProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId);
  const [baseWaypoints, setBaseWaypoints] = useState<WaypointRecord[]>([]);
  const [customWaypoints, setCustomWaypoints] = useState<WaypointRecord[]>([]);
  const [bounds, setBounds] = useState<BoundsLike | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const selectedSite = useMemo(
    () => sites.find((site) => site.siteId === selectedSiteId) ?? sites[0] ?? null,
    [selectedSiteId, sites]
  );

  const combinedWaypoints = useMemo(
    () => [...baseWaypoints, ...customWaypoints],
    [baseWaypoints, customWaypoints]
  );

  const visibleWaypoints = useMemo(
    () => combinedWaypoints.filter((waypoint) => containsBounds(bounds, waypoint)),
    [bounds, combinedWaypoints]
  );

  useEffect(() => {
    if (!selectedSite) {
      return;
    }

    router.replace(`/sites/waypoints?siteId=${encodeURIComponent(selectedSite.siteId)}`);
  }, [router, selectedSite]);

  useEffect(() => {
    let cancelled = false;

    async function loadWaypoints() {
      if (!selectedSite) {
        return;
      }

      setStatus("loading");
      setError("");
      setCustomWaypoints([]);

      try {
        const response = await fetch(
          `/api/sites/waypoints?siteId=${encodeURIComponent(selectedSite.siteId)}`
        );

        if (!response.ok) {
          throw new Error("웨이포인트를 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as { waypoints?: WaypointRecord[] };

        if (!cancelled) {
          setBaseWaypoints(payload.waypoints ?? []);
          setStatus("idle");
        }
      } catch (nextError) {
        if (!cancelled) {
          setBaseWaypoints([]);
          setStatus("error");
          setError(
            nextError instanceof Error ? nextError.message : "웨이포인트 로드 실패"
          );
        }
      }
    }

    void loadWaypoints();

    return () => {
      cancelled = true;
    };
  }, [selectedSite]);

  useEffect(() => {
    if (!mapRef.current || !selectedSite || !token) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [selectedSite.launchLng, selectedSite.launchLat],
      zoom: 10,
    });

    mapInstanceRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const syncBounds = () => {
      const currentBounds = map.getBounds();

      if (!currentBounds) {
        return;
      }

      setBounds({
        west: currentBounds.getWest(),
        south: currentBounds.getSouth(),
        east: currentBounds.getEast(),
        north: currentBounds.getNorth(),
      });
    };

    map.on("load", syncBounds);
    map.on("moveend", syncBounds);
    map.on("click", (event) => {
      if (!addMode || !selectedSite) {
        return;
      }

      setCustomWaypoints((current) => [
        ...current,
        createCustomWaypoint(
          selectedSite.siteId,
          current.length,
          event.lngLat.lat,
          event.lngLat.lng
        ),
      ]);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [addMode, selectedSite]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !selectedSite) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const points = [...baseWaypoints, ...customWaypoints];

    if (points.length > 0) {
      const taskBounds = new mapboxgl.LngLatBounds();
      points.forEach((waypoint) => {
        taskBounds.extend([waypoint.lng, waypoint.lat]);

        const markerEl = document.createElement("div");
        markerEl.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
        markerEl.style.backgroundColor = waypointMarkerColor(waypoint);

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([waypoint.lng, waypoint.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 10 }).setHTML(
              `<div style="font-family:Pretendard,sans-serif;"><strong>${waypoint.code}</strong><div style="margin-top:4px;font-size:12px;color:#57534e;">${waypoint.label ?? waypoint.name}</div></div>`
            )
          )
          .addTo(map);

        markerRefs.current.push(marker);
      });

      map.fitBounds(taskBounds, { padding: 48, maxZoom: 12.5, duration: 0 });
    } else {
      map.flyTo({
        center: [selectedSite.launchLng, selectedSite.launchLat],
        zoom: 10,
        essential: true,
      });
    }
  }, [baseWaypoints, customWaypoints, selectedSite]);

  function updateCustomWaypointName(index: number, value: string) {
    setCustomWaypoints((current) =>
      current.map((waypoint, waypointIndex) => {
        if (waypointIndex !== index) {
          return waypoint;
        }

        const nextLabel = value.trim() || waypoint.label || waypoint.name;
        const nextCode = ensureUniqueCode(current, nextLabel, waypointIndex);

        return {
          ...waypoint,
          code: nextCode,
          name: nextCode,
          label: nextLabel,
        };
      })
    );
  }

  function exportVisibleWaypoints() {
    if (!selectedSite || visibleWaypoints.length === 0) {
      return;
    }

    const file = buildWptWaypointSetFile({ waypoints: visibleWaypoints });
    downloadFile(
      file,
      `${selectedSite.siteId}-visible-waypoints.wpt`,
      "text/plain;charset=utf-8"
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            지역 웨이포인트 내보내기
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              지도 범위 안 웨이포인트를 모아
              <br />
              별도 세트로 내보냅니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              활공장을 고른 뒤 지도를 이동해 범위를 정하면, 현재 화면 안 웨이포인트만
              자동으로 집계됩니다. 지도에서 직접 추가한 포인트는 이름을 바꾼 뒤 함께
              포함해서 내보낼 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.85fr]">
        <section className="glass overflow-hidden rounded-[32px] border p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-500">대상 활공장</p>
              <select
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
              >
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.siteName} · {site.regionName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAddMode((current) => !current)}
                className={`btn ${addMode ? "btn-accent" : "btn-secondary"}`}
              >
                {addMode ? "추가 모드 끄기" : "지도 클릭으로 추가"}
              </button>
              <button
                type="button"
                onClick={exportVisibleWaypoints}
                disabled={visibleWaypoints.length === 0}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                현재 범위 웨이포인트 내보내기
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-stone-200 bg-white/80 p-3">
            <div
              ref={mapRef}
              className="h-[520px] w-full rounded-[24px]"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
            <span>현재 범위 {visibleWaypoints.length}개</span>
            <span>기본 웨이포인트 {baseWaypoints.length}개</span>
            <span>추가 포인트 {customWaypoints.length}개</span>
            <span>업로드/저장된 기존 웨이포인트도 함께 포함</span>
            {addMode ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
                지도 클릭으로 추가 중
              </span>
            ) : null}
          </div>
        </section>

        <aside className="glass rounded-[32px] border p-5">
          <p className="text-sm font-semibold text-stone-500">현재 내보내기 대상</p>
          <h2 className="mt-1 text-2xl font-bold text-stone-900">
            {selectedSite?.siteName ?? "활공장 선택"}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            지도 범위 안에 있는 웨이포인트만 목록에 들어옵니다. 추가 포인트는 아래에서
            이름을 바로 바꿀 수 있습니다.
          </p>

          {status === "error" ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {visibleWaypoints.map((waypoint) => {
              const customIndex = customWaypoints.findIndex(
                (item) => item.code === waypoint.code && item.lat === waypoint.lat && item.lng === waypoint.lng
              );
              const isCustom = customIndex >= 0;

              return (
                <div
                  key={`${waypoint.code}-${waypoint.lat}-${waypoint.lng}`}
                  className="rounded-2xl border border-stone-200 bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">{waypoint.code}</p>
                      <p className="mt-1 text-xs font-medium text-stone-500">
                        {waypoint.category} · {Math.round(waypoint.elevationM ?? 0)}m
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isCustom
                          ? "bg-amber-100 text-amber-900"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {isCustom ? "추가" : "기본"}
                    </span>
                  </div>
                  {isCustom ? (
                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        이름
                      </span>
                      <input
                        type="text"
                        value={waypoint.label ?? waypoint.name}
                        onChange={(event) =>
                          updateCustomWaypointName(customIndex, event.target.value)
                        }
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900"
                      />
                    </label>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-stone-800">
                      {waypoint.label ?? waypoint.name}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-stone-500">
                    {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
                  </p>
                </div>
              );
            })}

            {visibleWaypoints.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-5 text-sm text-stone-500">
                현재 지도 범위 안에 내보낼 웨이포인트가 없습니다. 지도를 이동하거나
                추가 모드로 포인트를 넣어 주세요.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
