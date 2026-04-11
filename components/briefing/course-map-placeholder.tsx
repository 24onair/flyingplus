"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BottleneckItem } from "@/types/briefing";
import { buildCircleCoordinates, computeTaskPath } from "@/lib/task/task-geometry";
import type {
  TaskPointType,
  WaypointCategory,
  WaypointRecord,
} from "@/types/course";

type CourseMapProps = {
  courseName: string;
  siteName: string;
  route: Array<{
    name: string;
    label?: string;
    lat?: number;
    lng?: number;
    radiusM?: number;
  }>;
  bottlenecks: BottleneckItem[];
  waypoints?: WaypointRecord[];
  onWaypointSelect?: (waypoint: WaypointRecord) => void;
  onCustomPointCreate?: (point: {
    lat: number;
    lng: number;
    elevationM: number | null;
  }) => void;
  editableDistanceKm?: number;
  editableTurnpoints?: Array<{
    order: number;
    name: string;
    label?: string;
    radiusM?: number;
    taskType?: TaskPointType;
  }>;
  terrainElevations?: Array<{
    order: number;
    elevationM: number | null;
  }>;
  onMoveTurnpoint?: (order: number, direction: "up" | "down") => void;
  onRemoveTurnpoint?: (order: number) => void;
  onResetRoute?: () => void;
  taskDistanceKm?: number;
  onRadiusChange?: (order: number, radiusM: number) => void;
  onTaskTypeChange?: (order: number, taskType: TaskPointType) => void;
  sssOpenTime?: string;
  taskDeadlineTime?: string;
  onSssOpenTimeChange?: (value: string) => void;
  onTaskDeadlineTimeChange?: (value: string) => void;
  onSaveTask?: () => void;
  onExportCup?: () => void;
  onExportXctsk?: () => void;
  onOpenXctskQr?: () => void;
  onTerrainElevationsChange?: (
    elevations: Array<{
      order: number;
      elevationM: number | null;
    }>
  ) => void;
  onTerrainProfileChange?: (
    samples: Array<{
      distanceKm: number;
      elevationM: number | null;
      segmentIndex: number;
    }>
  ) => void;
};

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const categoryOptions: Array<WaypointCategory | "all"> = [
  "all",
  "launch",
  "turnpoint",
  "landing",
  "reference",
];

const taskPointTypeOptions: Array<{ value: TaskPointType; label: string }> = [
  { value: "start", label: "TakeOff" },
  { value: "sss", label: "SSS" },
  { value: "turnpoint", label: "턴포인트" },
  { value: "ess", label: "ESS" },
  { value: "goal", label: "골" },
];

function severityColor(severity: BottleneckItem["severity"]) {
  switch (severity) {
    case "critical":
      return "#b91c1c";
    case "high":
      return "#d97706";
    default:
      return "#2563eb";
  }
}

function waypointCategoryColor(category: WaypointCategory) {
  switch (category) {
    case "launch":
      return "#2563eb";
    case "landing":
      return "#16a34a";
    case "reference":
      return "#78716c";
    default:
      return "#7c3aed";
  }
}

function waypointCategoryLabel(category: WaypointCategory | "all") {
  switch (category) {
    case "all":
      return "전체";
    case "launch":
      return "이륙장";
    case "turnpoint":
      return "턴포인트";
    case "landing":
      return "랜딩장";
    case "reference":
      return "참조점";
  }
}

export function CourseMapPlaceholder({
  courseName,
  siteName,
  route,
  bottlenecks,
  waypoints = [],
  onWaypointSelect,
  onCustomPointCreate,
  editableDistanceKm = 0,
  editableTurnpoints = [],
  terrainElevations = [],
  onMoveTurnpoint,
  onRemoveTurnpoint,
  onResetRoute,
  taskDistanceKm = 0,
  onRadiusChange,
  onTaskTypeChange,
  sssOpenTime = "12:00",
  taskDeadlineTime = "23:00",
  onSssOpenTimeChange,
  onTaskDeadlineTimeChange,
  onSaveTask,
  onExportCup,
  onExportXctsk,
  onOpenXctskQr,
  onTerrainElevationsChange,
  onTerrainProfileChange,
}: CourseMapProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("mapbox-gl").Map | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const waypointSelectRef = useRef(onWaypointSelect);
  const customPointCreateRef = useRef(onCustomPointCreate);
  const terrainElevationsChangeRef = useRef(onTerrainElevationsChange);
  const terrainProfileChangeRef = useRef(onTerrainProfileChange);
  const viewportRef = useRef<{
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<WaypointCategory | "all">(
    "all"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const validRoute = useMemo(
    () =>
      route.filter(
        (
          point
        ): point is {
          name: string;
          label?: string;
          lat: number;
          lng: number;
          radiusM?: number;
        } =>
          typeof point.lat === "number" && typeof point.lng === "number"
      ),
    [route]
  );

  const visibleWaypoints = useMemo(
    () =>
      waypoints.filter((waypoint) =>
        selectedCategory === "all" ? true : waypoint.category === selectedCategory
      ),
    [selectedCategory, waypoints]
  );

  const waypointCounts = useMemo(
    () =>
      waypoints.reduce<Record<WaypointCategory, number>>(
        (acc, waypoint) => {
          acc[waypoint.category] += 1;
          return acc;
        },
        {
          launch: 0,
          turnpoint: 0,
          landing: 0,
          reference: 0,
        }
      ),
    [waypoints]
  );

  const terrainElevationMap = useMemo(
    () => new Map(terrainElevations.map((item) => [item.order, item.elevationM])),
    [terrainElevations]
  );

  useEffect(() => {
    waypointSelectRef.current = onWaypointSelect;
  }, [onWaypointSelect]);

  useEffect(() => {
    customPointCreateRef.current = onCustomPointCreate;
  }, [onCustomPointCreate]);

  useEffect(() => {
    terrainElevationsChangeRef.current = onTerrainElevationsChange;
  }, [onTerrainElevationsChange]);

  useEffect(() => {
    terrainProfileChangeRef.current = onTerrainProfileChange;
  }, [onTerrainProfileChange]);

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === sectionRef.current;
      setIsFullscreen(active);

      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        const map = mapInstanceRef.current;
        const container = mapRef.current;

        if (!map || !container || !container.isConnected) {
          return;
        }

        try {
          map.resize();
        } catch {
          // Ignore resize attempts during fullscreen teardown/recreation.
        }
      }, 150);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !mapRef.current || validRoute.length === 0) {
      return;
    }

    let disposed = false;
    let mapInstance: import("mapbox-gl").Map | null = null;
    const markers: import("mapbox-gl").Marker[] = [];

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (disposed || !mapRef.current) {
        return;
      }

      mapboxgl.accessToken = accessToken;

      mapInstance = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: viewportRef.current?.center ?? [validRoute[0].lng, validRoute[0].lat],
        zoom: viewportRef.current?.zoom ?? 9,
        bearing: viewportRef.current?.bearing ?? 0,
        pitch: viewportRef.current?.pitch ?? 0,
      });
      mapInstanceRef.current = mapInstance;

      mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapInstance.on("moveend", () => {
        const center = mapInstance?.getCenter();

        if (!mapInstance || !center) {
          return;
        }

        viewportRef.current = {
          center: [center.lng, center.lat],
          zoom: mapInstance.getZoom(),
          bearing: mapInstance.getBearing(),
          pitch: mapInstance.getPitch(),
        };
      });

      mapInstance.on("click", (event) => {
        if (!customPointCreateRef.current) {
          return;
        }

        customPointCreateRef.current({
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
          elevationM:
            mapInstance?.queryTerrainElevation([event.lngLat.lng, event.lngLat.lat], {
              exaggerated: false,
            }) ?? null,
        });
      });

      mapInstance.on("load", () => {
        const currentMap = mapInstance;

        if (!currentMap) {
          return;
        }

        currentMap.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });

        currentMap.setTerrain({
          source: "mapbox-dem",
          exaggeration: 1.15,
        });

        const routeCoordinates = validRoute.map((point) => [point.lng, point.lat]);
        const taskPath = computeTaskPath(
          validRoute.map((point) => ({
            lat: point.lat,
            lng: point.lng,
            radiusM: point.radiusM ?? 0,
          }))
        );
        const taskCircles = validRoute
          .filter((point) => typeof point.radiusM === "number" && point.radiusM > 0)
          .map((point) => ({
            type: "Feature" as const,
            geometry: {
              type: "Polygon" as const,
              coordinates: [
                buildCircleCoordinates(
                  point.lat,
                  point.lng,
                  point.radiusM ?? 0
                ),
              ],
            },
            properties: {
              name: point.name,
            },
          }));
        const edgeLines = taskPath.segments.map((segment) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: segment,
          },
          properties: {},
        }));

        currentMap.addSource("course-route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routeCoordinates,
            },
            properties: {},
          },
        });

        currentMap.addLayer({
          id: "course-route-line",
          type: "line",
          source: "course-route",
          paint: {
            "line-color": "#64748b",
            "line-width": 2,
            "line-opacity": 0.4,
            "line-dasharray": [2, 2],
          },
        });

        currentMap.addSource("task-circles", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: taskCircles,
          },
        });

        currentMap.addLayer({
          id: "task-circles-fill",
          type: "fill",
          source: "task-circles",
          paint: {
            "fill-color": "#ef4444",
            "fill-opacity": 0.14,
          },
        });

        currentMap.addLayer({
          id: "task-circles-outline",
          type: "line",
          source: "task-circles",
          paint: {
            "line-color": "#ef4444",
            "line-width": 2,
            "line-opacity": 0.9,
          },
        });

        currentMap.addSource("task-edge-lines", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: edgeLines,
          },
        });

        currentMap.addLayer({
          id: "task-edge-lines-layer",
          type: "line",
          source: "task-edge-lines",
          paint: {
            "line-color": "#2563eb",
            "line-width": 6,
            "line-opacity": 1,
          },
        });

        const bounds = new mapboxgl.LngLatBounds();

        visibleWaypoints.forEach((waypoint) => {
          bounds.extend([waypoint.lng, waypoint.lat]);

          const dot = document.createElement("div");
          dot.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
          dot.style.backgroundColor = waypointCategoryColor(waypoint.category);
          dot.style.cursor = onWaypointSelect ? "pointer" : "default";

          if (onWaypointSelect) {
            dot.addEventListener("click", (event) => {
              event.stopPropagation();
              waypointSelectRef.current?.(waypoint);
            });
          }

          const popupTitle = waypoint.label
            ? `${waypoint.code} / ${waypoint.label}`
            : waypoint.code;

          const marker = new mapboxgl.Marker(dot)
            .setLngLat([waypoint.lng, waypoint.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 10 }).setHTML(
                `<div style="font-family: Pretendard, sans-serif;"><strong>${popupTitle}</strong><div style="margin-top:4px;font-size:12px;color:#57534e;">${waypointCategoryLabel(waypoint.category)} · ${waypoint.elevationM}m</div></div>`
              )
            )
            .addTo(currentMap);

          markers.push(marker);
        });

        validRoute.forEach((point, index) => {
          bounds.extend([point.lng, point.lat]);

          const markerLabel = point.label
            ? `${point.name} / ${point.label}`
            : point.name;

          const wrapper = document.createElement("div");
          wrapper.className = "flex items-center gap-2";

          const el = document.createElement("div");
          el.className =
            "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stone-900 text-xs font-bold text-white shadow-lg";
          el.textContent = String(index + 1);

          const text = document.createElement("div");
          text.className =
            "rounded-xl border border-stone-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-900 shadow-lg backdrop-blur";
          text.textContent = markerLabel;

          wrapper.appendChild(el);
          wrapper.appendChild(text);

          const marker = new mapboxgl.Marker(wrapper, {
            anchor: "left",
          })
            .setLngLat([point.lng, point.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 16 }).setHTML(
                `<div style="font-family: Pretendard, sans-serif;"><strong>${markerLabel}</strong><div style="margin-top:4px;font-size:12px;color:#57534e;">턴포인트 ${index + 1}</div></div>`
              )
            )
            .addTo(currentMap);

          markers.push(marker);
        });

        bottlenecks.forEach((bottleneck) => {
          if (!bottleneck.location) {
            return;
          }

          bounds.extend([bottleneck.location.lng, bottleneck.location.lat]);

          const el = document.createElement("div");
          el.className = "h-4 w-4 rounded-full border-2 border-white shadow-lg";
          el.style.backgroundColor = severityColor(bottleneck.severity);

          const marker = new mapboxgl.Marker(el)
            .setLngLat([bottleneck.location.lng, bottleneck.location.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 12 }).setHTML(
                `<div style="font-family: Pretendard, sans-serif;"><strong>${bottleneck.name}</strong><div style="margin-top:4px;font-size:12px;color:#57534e;">${bottleneck.type}</div><div style="margin-top:6px;font-size:12px;line-height:1.5;color:#44403c;">${bottleneck.message}</div></div>`
              )
            )
            .addTo(currentMap);

          markers.push(marker);
        });

        if (!bounds.isEmpty() && !viewportRef.current) {
          currentMap.fitBounds(bounds, {
            padding: 56,
            maxZoom: 11.5,
          });
        }

        currentMap.once("idle", () => {
          terrainElevationsChangeRef.current?.(
            validRoute.map((point, index) => ({
              order: index + 1,
              elevationM:
                currentMap.queryTerrainElevation([point.lng, point.lat], {
                  exaggerated: false,
                }) ?? null,
            }))
          );

          const samples: Array<{
            distanceKm: number;
            elevationM: number | null;
            segmentIndex: number;
          }> = [];
          let cumulativeDistanceKm = 0;

          validRoute.forEach((point, index) => {
            if (index === validRoute.length - 1) {
              return;
            }

            const nextPoint = validRoute[index + 1];
            const segmentDistanceKm = Math.max(
              0.001,
              haversineDistanceKm(
                { lat: point.lat, lng: point.lng },
                { lat: nextPoint.lat, lng: nextPoint.lng }
              )
            );
            const steps = Math.max(2, Math.ceil((segmentDistanceKm * 1000) / 250));

            for (let step = 0; step <= steps; step += 1) {
              if (index > 0 && step === 0) {
                continue;
              }

              const ratio = step / steps;
              const lng = point.lng + (nextPoint.lng - point.lng) * ratio;
              const lat = point.lat + (nextPoint.lat - point.lat) * ratio;

              samples.push({
                distanceKm: cumulativeDistanceKm + segmentDistanceKm * ratio,
                elevationM:
                  currentMap.queryTerrainElevation([lng, lat], {
                    exaggerated: false,
                  }) ?? null,
                segmentIndex: index,
              });
            }

            cumulativeDistanceKm += segmentDistanceKm;
          });

          terrainProfileChangeRef.current?.(samples);
        });
      });
    }

    void initMap();

    return () => {
      disposed = true;
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      if (mapInstance) {
        const center = mapInstance.getCenter();
        viewportRef.current = {
          center: [center.lng, center.lat],
          zoom: mapInstance.getZoom(),
          bearing: mapInstance.getBearing(),
          pitch: mapInstance.getPitch(),
        };
      }
      markers.forEach((marker) => marker.remove());
      mapInstanceRef.current = null;
      mapInstance?.remove();
    };
  }, [
    bottlenecks,
    isFullscreen,
    validRoute,
    visibleWaypoints,
  ]);

  async function toggleFullscreen() {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (document.fullscreenElement === section) {
      await document.exitFullscreen();
      return;
    }

    await section.requestFullscreen();
  }

  if (validRoute.length === 0) {
    return (
      <section
        ref={sectionRef}
        className="glass relative min-h-[420px] overflow-hidden rounded-[32px] border p-5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,107,87,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,239,228,0.92))]" />
        <div className="relative z-10">
          <p className="text-sm font-semibold text-stone-500">지도 데이터 없음</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">{siteName}</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-600">
            현재 코스에 좌표 데이터가 없어 지도를 그릴 수 없습니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`glass relative overflow-hidden border ${
        isFullscreen
          ? "min-h-screen rounded-none border-0 bg-stone-950"
          : "min-h-[420px] rounded-[32px]"
      }`}
    >
      <div ref={mapRef} className={isFullscreen ? "h-screen w-full" : "h-[420px] w-full"} />

      <button
        type="button"
        onClick={() => {
          void toggleFullscreen();
        }}
        className="pointer-events-auto absolute right-4 top-4 z-20 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        {isFullscreen ? "전체 보기 닫기" : "지도 전체 보기"}
      </button>

      <div className="pointer-events-none absolute left-4 top-4 right-20 z-10 flex flex-wrap gap-3">
        <div className="rounded-2xl bg-white/92 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            추천 코스
          </p>
          <p className="mt-2 text-lg font-bold text-stone-900">{courseName}</p>
        </div>
        <div className="rounded-2xl bg-white/92 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            지도 상태
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            빨간 원은 태스크 반경, 파란 굵은 선은 써클 외곽 기준 최단 연결선, 회색 점선은 중심 연결 참고선입니다.
          </p>
          {onWaypointSelect ? (
            <p className="mt-2 text-xs font-medium text-stone-500">
              웨이포인트 점을 클릭하면 현재 코스에 바로 추가되고, 빈 지도를 클릭하면 커스텀 포인트를 만들 수 있습니다.
            </p>
          ) : null}
        </div>
      </div>

      {waypoints.length > 0 ? (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-3 lg:right-auto lg:max-w-[540px]">
          <div className="pointer-events-auto flex flex-wrap gap-2 rounded-2xl bg-white/92 p-3 shadow-sm backdrop-blur">
            {categoryOptions.map((category) => {
              const count =
                category === "all"
                  ? waypoints.length
                  : waypointCounts[category as WaypointCategory];
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {waypointCategoryLabel(category)} {count}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-white/92 p-3 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              문경 웨이포인트 DB
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-700">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: waypointCategoryColor("launch") }}
                />
                이륙장 {waypointCounts.launch}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: waypointCategoryColor("turnpoint") }}
                />
                턴포인트 {waypointCounts.turnpoint}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: waypointCategoryColor("landing") }}
                />
                랜딩장 {waypointCounts.landing}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: waypointCategoryColor("reference") }}
                />
                참조점 {waypointCounts.reference}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {!accessToken ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(244,239,228,0.82)] p-6 backdrop-blur-sm">
          <div className="max-w-md rounded-[28px] border border-stone-200 bg-white p-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-stone-500">Mapbox 토큰 필요</p>
            <h2 className="mt-2 text-xl font-bold text-stone-900">
              실제 지도를 보려면 환경변수를 추가해 주세요
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              `.env.local`에 `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=...`을 넣고 dev 서버를 다시
              시작하면 이 코스가 지도 위에 표시됩니다.
            </p>
          </div>
        </div>
      ) : null}

      {isFullscreen ? (
        <>
          <button
            type="button"
            onClick={() => {
              void toggleFullscreen();
            }}
            className="pointer-events-auto absolute right-4 top-20 z-20 rounded-full border border-stone-300 bg-white/92 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur"
          >
            ESC 또는 닫기
          </button>

          <aside className="pointer-events-auto absolute right-4 top-36 bottom-4 z-20 w-[360px] overflow-y-auto rounded-[28px] border border-stone-200 bg-white/94 p-5 shadow-xl backdrop-blur">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-stone-500">편집 중인 코스</p>
              <h2 className="text-xl font-bold text-stone-900">{courseName}</h2>
              <p className="text-sm leading-6 text-stone-600">
                전체화면에서도 코스를 바로 수정하고 거리를 확인할 수 있습니다.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-stone-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                현재 코스 거리
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900">
                {editableDistanceKm.toFixed(1)}km
              </p>
              <p className="mt-1 text-sm text-stone-600">
                써클 경계 기준 태스크 거리 {taskDistanceKm.toFixed(1)}km
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  웨이포인트 목록
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onExportCup}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    CUP 내보내기
                  </button>
                  <button
                    type="button"
                    onClick={onExportXctsk}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                  >
                    XCTrack 내보내기
                  </button>
                  <button
                    type="button"
                    onClick={onOpenXctskQr}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                  >
                    XCTrack QR
                  </button>
                  <button
                    type="button"
                    onClick={onSaveTask}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    타스크 저장
                  </button>
                  <button
                    type="button"
                    onClick={onResetRoute}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                  >
                    추천 코스로 되돌리기
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 rounded-[24px] border border-stone-200 bg-white/80 p-4">
                <label className="text-sm font-medium text-stone-700">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    SSS Open
                  </span>
                  <input
                    type="time"
                    value={sssOpenTime}
                    onChange={(event) =>
                      onSssOpenTimeChange?.(event.target.value)
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
                  />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Task Deadline
                  </span>
                  <input
                    type="time"
                    value={taskDeadlineTime}
                    onChange={(event) =>
                      onTaskDeadlineTimeChange?.(event.target.value)
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
                  />
                </label>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-stone-700">
                {editableTurnpoints.map((turnpoint, index) => (
                  <li key={turnpoint.order} className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-900">
                      {turnpoint.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">
                        {turnpoint.label
                          ? `${turnpoint.name} / ${turnpoint.label}`
                          : turnpoint.name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-stone-500">
                        지형 고도:{" "}
                        {terrainElevationMap.get(turnpoint.order) != null
                          ? `${Math.round(terrainElevationMap.get(turnpoint.order) ?? 0)}m`
                          : "불러오는 중"}
                      </p>
                      <div className="mt-2">
                        <select
                          value={turnpoint.taskType ?? "turnpoint"}
                          onChange={(event) =>
                            onTaskTypeChange?.(
                              turnpoint.order,
                              event.target.value as TaskPointType
                            )
                          }
                          className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                        >
                          {taskPointTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min={100}
                          max={2000}
                          step={50}
                          value={turnpoint.radiusM ?? 400}
                          onChange={(event) =>
                            onRadiusChange?.(
                              turnpoint.order,
                              Number(event.target.value)
                            )
                          }
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={100}
                          step={50}
                          value={turnpoint.radiusM ?? 400}
                          onChange={(event) =>
                            onRadiusChange?.(
                              turnpoint.order,
                              Math.max(100, Number(event.target.value) || 100)
                            )
                          }
                          className="w-20 rounded-xl border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700"
                        />
                        <span className="whitespace-nowrap text-xs font-semibold text-stone-600">
                          m
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveTurnpoint?.(turnpoint.order, "up")}
                        disabled={index === 0}
                        className="rounded-full border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        위
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveTurnpoint?.(turnpoint.order, "down")}
                        disabled={index === editableTurnpoints.length - 1}
                        className="rounded-full border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        아래
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTurnpoint?.(turnpoint.order)}
                        className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                지도에서 웨이포인트를 클릭하면 현재 코스 끝에 추가됩니다.
              </p>
            </div>
          </aside>
        </>
      ) : null}
    </section>
  );
}

function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
