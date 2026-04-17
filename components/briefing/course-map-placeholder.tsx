"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BottleneckItem } from "@/types/briefing";
import { buildCircleCoordinates, computeTaskPath } from "@/lib/task/task-geometry";
import type {
  TaskPointType,
  WaypointCategory,
  WaypointRecord,
} from "@/types/course";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement() {
  const fullscreenDocument = document as FullscreenDocument;
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
}

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
  topLevelFullscreenHref?: string;
  autoOpenFullscreen?: boolean;
};

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const DEFAULT_MAP_CENTER: [number, number] = [128, 36.2];
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
  siteName: _siteName,
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
  topLevelFullscreenHref,
  autoOpenFullscreen = false,
}: CourseMapProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("mapbox-gl").Map | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const waypointSelectRef = useRef(onWaypointSelect);
  const customPointCreateRef = useRef(onCustomPointCreate);
  const terrainElevationsChangeRef = useRef(onTerrainElevationsChange);
  const terrainProfileChangeRef = useRef(onTerrainProfileChange);
  const preserveViewportOnNextRouteChangeRef = useRef(false);
  const autoOpenedFullscreenRef = useRef(false);
  const isMapReadyRef = useRef(false);
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
  const [useNativeFullscreen, setUseNativeFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "searching" | "found" | "empty" | "error"
  >("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [centerLabel, setCenterLabel] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);

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
    const container = mapRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        try {
          mapInstanceRef.current?.resize();
        } catch {
          // Ignore resize attempts while Mapbox is rebuilding its canvas.
        }
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine)"
    );
    const updateMode = () => setUseNativeFullscreen(mediaQuery.matches);

    updateMode();
    mediaQuery.addEventListener("change", updateMode);

    return () => {
      mediaQuery.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    if (!useNativeFullscreen) {
      return undefined;
    }

    function handleFullscreenChange() {
      setIsFullscreen(getFullscreenElement() === sectionRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange as EventListener
      );
    };
  }, [useNativeFullscreen]);

  useEffect(() => {
    if (
      !autoOpenFullscreen ||
      isFullscreen ||
      autoOpenedFullscreenRef.current ||
      !isMapReady
    ) {
      return;
    }

    if (useNativeFullscreen) {
      return;
    }

    autoOpenedFullscreenRef.current = true;
    setIsFullscreen(true);
  }, [autoOpenFullscreen, isFullscreen, isMapReady, useNativeFullscreen]);

  useEffect(() => {
    if (!isFullscreen || useNativeFullscreen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [isFullscreen, useNativeFullscreen]);

  useEffect(() => {
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
        // Ignore resize attempts during layout transitions.
      }
    }, 150);

    return () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!accessToken || !mapRef.current) {
      return;
    }

    let disposed = false;
    let mapInstance: import("mapbox-gl").Map | null = null;
    const markers: import("mapbox-gl").Marker[] = [];

    isMapReadyRef.current = false;
    setIsMapReady(false);

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      const isCompactViewport =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches;

      if (disposed || !mapRef.current) {
        return;
      }

      mapboxgl.accessToken = accessToken;

      mapInstance = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center:
          viewportRef.current?.center ??
          (validRoute[0]
            ? [validRoute[0].lng, validRoute[0].lat]
            : DEFAULT_MAP_CENTER),
        zoom: viewportRef.current?.zoom ?? (validRoute[0] ? 9 : 6.7),
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
        const currentMap = mapInstance;

        if (!customPointCreateRef.current || !currentMap) {
          return;
        }

        try {
          currentMap.resize();
        } catch {
          // The click can arrive during iframe/mobile layout transitions.
        }

        const sourceEvent = event.originalEvent as MouseEvent | undefined;
        const canvasRect = currentMap.getCanvas().getBoundingClientRect();
        const clickedLngLat =
          sourceEvent && typeof sourceEvent.clientX === "number"
            ? currentMap.unproject([
                sourceEvent.clientX - canvasRect.left,
                sourceEvent.clientY - canvasRect.top,
              ])
            : event.lngLat;
        const center = currentMap.getCenter();

        viewportRef.current = {
          center: [center.lng, center.lat],
          zoom: currentMap.getZoom(),
          bearing: currentMap.getBearing(),
          pitch: currentMap.getPitch(),
        };
        preserveViewportOnNextRouteChangeRef.current = true;

        customPointCreateRef.current({
          lat: clickedLngLat.lat,
          lng: clickedLngLat.lng,
          elevationM:
            currentMap.queryTerrainElevation([clickedLngLat.lng, clickedLngLat.lat], {
              exaggerated: false,
            }) ?? null,
        });
      });

      mapInstance.on("load", () => {
        const currentMap = mapInstance;

        if (!currentMap) {
          return;
        }

        isMapReadyRef.current = true;
        setIsMapReady(true);

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
          data:
            routeCoordinates.length >= 2
              ? {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: routeCoordinates,
                  },
                  properties: {},
                }
              : {
                  type: "FeatureCollection",
                  features: [],
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

        const taskBounds = new mapboxgl.LngLatBounds();

        validRoute.forEach((point) => {
          taskBounds.extend([point.lng, point.lat]);
        });

        visibleWaypoints.forEach((waypoint) => {
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
          const markerLabel = point.label
            ? `${point.name} / ${point.label}`
            : point.name;

          const wrapper = document.createElement("div");
          wrapper.className = "flex items-center gap-1.5";

          const el = document.createElement("div");
          el.className =
            "flex h-7 w-7 items-center justify-center rounded-[4px] border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 shadow";
          el.textContent = String(index + 1);

          wrapper.appendChild(el);

          if (!isCompactViewport) {
            const text = document.createElement("div");
            text.className =
              "rounded-[4px] border border-slate-200 bg-white/96 px-2 py-1 text-[11px] font-medium text-slate-700 shadow";
            text.textContent = markerLabel;
            wrapper.appendChild(text);
          }

          const marker = new mapboxgl.Marker(wrapper, {
            anchor: isCompactViewport ? "center" : "left",
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

        const shouldPreserveViewport = preserveViewportOnNextRouteChangeRef.current;

        if (!taskBounds.isEmpty() && !shouldPreserveViewport) {
          currentMap.fitBounds(taskBounds, {
            padding:
              isFullscreen && !isCompactViewport
                ? { top: 80, right: 440, bottom: 80, left: 80 }
                : isCompactViewport
                  ? 40
                  : 72,
            maxZoom: 12.5,
            duration: 0,
          });
        }

        if (shouldPreserveViewport) {
          preserveViewportOnNextRouteChangeRef.current = false;
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
      isMapReadyRef.current = false;
      setIsMapReady(false);
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

  async function searchPlace() {
    const query = searchQuery.trim();

    if (!query || !accessToken) {
      return;
    }

    setSearchStatus("searching");
    setSearchMessage("");

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${encodeURIComponent(
          accessToken
        )}&language=ko&limit=1&country=kr`
      );

      if (!response.ok) {
        throw new Error("지명 검색 요청 실패");
      }

      const payload = (await response.json()) as {
        features?: Array<{
          place_name_ko?: string;
          place_name?: string;
          text_ko?: string;
          text?: string;
          center?: [number, number];
        }>;
      };

      const feature = payload.features?.[0];

      if (!feature?.center || feature.center.length < 2) {
        setSearchStatus("empty");
        setSearchMessage("검색 결과가 없습니다.");
        setCenterLabel("");
        return;
      }

      const label =
        feature.text_ko ??
        feature.text ??
        feature.place_name_ko ??
        feature.place_name ??
        query;

      mapInstanceRef.current?.flyTo({
        center: feature.center,
        zoom: Math.max(mapInstanceRef.current?.getZoom() ?? 11, 11),
        essential: true,
      });

      setCenterLabel(label);
      setSearchStatus("found");
      setSearchMessage(`${label} 검색 완료`);
    } catch {
      setSearchStatus("error");
      setSearchMessage("지명 검색에 실패했습니다.");
      setCenterLabel("");
    }
  }

  async function toggleFullscreen() {
    let isEmbeddedContext = false;

    try {
      isEmbeddedContext = Boolean(window.top && window.top !== window.self);
    } catch {
      isEmbeddedContext = true;
    }

    if (!isFullscreen && topLevelFullscreenHref && isEmbeddedContext) {
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = topLevelFullscreenHref;
          return;
        }
      } catch {
        // Fall through to additional navigation attempts below.
      }

      try {
        window.open(topLevelFullscreenHref, "_top");
        return;
      } catch {
        // Ignore and use current-window fallback below.
      }

      window.location.href = topLevelFullscreenHref;
      return;
    }

    if (!useNativeFullscreen) {
      setIsFullscreen((current) => !current);
      return;
    }

    const section = sectionRef.current as FullscreenElement | null;
    const fullscreenDocument = document as FullscreenDocument;

    if (!section) {
      return;
    }

    if (getFullscreenElement() === section) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        await fullscreenDocument.webkitExitFullscreen?.();
      }
      return;
    }

    if (section.requestFullscreen) {
      await section.requestFullscreen();
    } else {
      await section.webkitRequestFullscreen?.();
    }
  }

  return (
    <section
      ref={sectionRef}
      className={`glass relative overflow-hidden border ${
        isFullscreen
          ? `${
              useNativeFullscreen ? "min-h-[100dvh]" : "fixed inset-0 z-[80]"
            } min-h-[100dvh] rounded-none border-0 bg-stone-950`
          : "min-h-[420px] rounded-[32px]"
      }`}
    >
      <div
        ref={mapRef}
        className={isFullscreen ? "h-[100dvh] w-full" : "h-[420px] w-full"}
      />

      {isFullscreen && !useNativeFullscreen ? (
        <button
          type="button"
          onClick={() => {
            void toggleFullscreen();
          }}
          className="pointer-events-auto fixed right-3 top-[calc(env(safe-area-inset-top)+12px)] z-[95] rounded-2xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white shadow-lg sm:right-4 sm:top-[calc(env(safe-area-inset-top)+16px)] sm:px-4 sm:py-3 sm:text-sm"
        >
          전체 보기 닫기
        </button>
      ) : null}

      {accessToken ? (
        <div className="pointer-events-auto absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+10px)] z-20 flex flex-col gap-2 sm:left-4 sm:right-auto sm:top-[calc(env(safe-area-inset-top)+14px)] sm:w-[320px]">
          <div className="flex items-center gap-2 rounded-[4px] border border-slate-200 bg-white/94 p-2 shadow-sm backdrop-blur">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchPlace();
                }
              }}
              placeholder="지명 검색"
              className="min-w-0 flex-1 rounded-[4px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                void searchPlace();
              }}
              disabled={searchStatus === "searching" || !searchQuery.trim()}
              className="rounded-[4px] border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchStatus === "searching" ? "검색 중..." : "검색"}
            </button>
          </div>
          {searchStatus === "empty" || searchStatus === "error" ? (
            <div className="rounded-[4px] border border-red-200 bg-white/96 px-3 py-2 text-sm font-medium text-red-700 shadow-sm backdrop-blur">
              {searchMessage}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void toggleFullscreen();
        }}
        className={`pointer-events-auto absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-20 rounded-[4px] border border-[#8bb8e8] bg-white/96 px-3 py-2 text-xs font-semibold text-[#4a89c7] shadow-sm sm:right-4 sm:top-[calc(env(safe-area-inset-top)+14px)] sm:px-4 sm:py-2.5 sm:text-sm ${
          isFullscreen && !useNativeFullscreen ? "hidden" : ""
        }`}
      >
        {isFullscreen ? "전체 보기 닫기" : "지도 전체 보기"}
      </button>

      <div className="pointer-events-none absolute left-3 right-24 top-[calc(env(safe-area-inset-top)+66px)] z-10 flex max-w-[min(100%-6rem,44rem)] flex-wrap gap-2 sm:left-4 sm:right-4 sm:top-[calc(env(safe-area-inset-top)+70px)] sm:gap-2">
        <div className="max-w-[240px] rounded-[4px] border border-slate-200 bg-white/94 px-3 py-2 shadow-sm backdrop-blur sm:max-w-[280px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            추천 코스
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{courseName}</p>
          {validRoute.length === 0 ? (
            <p className="mt-1.5 text-[11px] font-medium leading-5 text-slate-500">
              지명을 검색한 뒤 지도를 클릭해 첫 타스크 포인트를 만들 수 있습니다.
            </p>
          ) : null}
        </div>
        <div className="hidden max-w-[420px] rounded-[4px] border border-slate-200 bg-white/94 px-3 py-2 shadow-sm backdrop-blur lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            지도 상태
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            빨간 원은 태스크 반경, 파란 굵은 선은 써클 외곽 기준 최단 연결선, 회색 점선은 중심 연결 참고선입니다.
          </p>
          {onWaypointSelect ? (
            <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
              웨이포인트 점을 클릭하면 현재 코스에 바로 추가되고, 빈 지도를 클릭하면 커스텀 포인트를 만들 수 있습니다.
            </p>
          ) : null}
        </div>
      </div>

      {waypoints.length > 0 ? (
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-2 sm:bottom-4 sm:left-4 sm:right-4 sm:gap-3 lg:right-auto lg:max-w-[540px]">
          <div className="pointer-events-auto flex flex-wrap gap-2 rounded-2xl bg-white/92 p-2.5 shadow-sm backdrop-blur sm:p-3">
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

          <div className="hidden rounded-2xl bg-white/92 p-3 shadow-sm backdrop-blur sm:block">
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

      {centerLabel ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[15] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="rounded-[4px] border border-[#8bb8e8] bg-white/96 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur">
            {centerLabel}
          </div>
          <div className="relative h-7 w-7">
            <span className="absolute left-1/2 top-0 h-7 w-[2px] -translate-x-1/2 rounded-full bg-sky-500/90" />
            <span className="absolute left-0 top-1/2 h-[2px] w-7 -translate-y-1/2 rounded-full bg-sky-500/90" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow" />
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
            className="pointer-events-auto absolute right-3 top-14 z-20 rounded-full border border-stone-300 bg-white/92 px-3 py-2 text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur sm:right-4 sm:top-20 sm:text-xs"
          >
            ESC 또는 닫기
          </button>

          <aside className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 max-h-[48dvh] overflow-y-auto rounded-[28px] border border-stone-200 bg-white/94 p-4 shadow-xl backdrop-blur sm:inset-x-auto sm:right-4 sm:top-36 sm:bottom-4 sm:max-h-none sm:w-[360px] sm:p-5">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  웨이포인트 목록
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
                  <li
                    key={turnpoint.order}
                    className="flex flex-col gap-3 rounded-2xl bg-stone-50/80 p-3 sm:flex-row sm:items-center"
                  >
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
                      <div className="mt-2 flex flex-wrap items-center gap-3">
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
                    <div className="flex flex-wrap items-center gap-1 sm:self-start">
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
