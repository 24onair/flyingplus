"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

type SiteRegistrationMapPreviewProps = {
  launch: {
    name: string;
    lat: number;
    lng: number;
  };
  landing: {
    name: string;
    lat: number;
    lng: number;
  };
  activeTarget: "launch" | "landing";
  onPickLocation: (
    target: "launch" | "landing",
    lat: number,
    lng: number,
    elevationM: number | null
  ) => void;
  readOnly?: boolean;
};

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (token) {
  mapboxgl.accessToken = token;
}

export function SiteRegistrationMapPreview({
  launch,
  landing,
  activeTarget,
  onPickLocation,
  readOnly = false,
}: SiteRegistrationMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const launchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const landingMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activeTargetRef = useRef(activeTarget);
  const pickLocationRef = useRef(onPickLocation);

  useEffect(() => {
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  useEffect(() => {
    pickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [launch.lng, launch.lat],
      zoom: 10.5,
    });

    map.on("load", () => {
      if (!map.getSource("registration-dem")) {
        map.addSource("registration-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.setTerrain({
        source: "registration-dem",
        exaggeration: 1.1,
      });
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    if (!readOnly) {
      map.on("click", (event) => {
        const sampledElevation = map.queryTerrainElevation(event.lngLat, {
          exaggerated: false,
        });

        pickLocationRef.current(
          activeTargetRef.current,
          Number(event.lngLat.lat.toFixed(6)),
          Number(event.lngLat.lng.toFixed(6)),
          typeof sampledElevation === "number" ? Math.round(sampledElevation) : null
        );
      });
    }
    mapRef.current = map;

    return () => {
      launchMarkerRef.current?.remove();
      landingMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [launch.lat, launch.lng]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    launchMarkerRef.current?.remove();
    landingMarkerRef.current?.remove();

    const launchPopup = new mapboxgl.Popup({ offset: 20 }).setHTML(
      `<strong>TakeOff</strong><br/>${launch.name}`
    );
    const landingPopup = new mapboxgl.Popup({ offset: 20 }).setHTML(
      `<strong>Landing</strong><br/>${landing.name}`
    );

    launchMarkerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
      .setLngLat([launch.lng, launch.lat])
      .setPopup(launchPopup)
      .addTo(map);

    landingMarkerRef.current = new mapboxgl.Marker({ color: "#16a34a" })
      .setLngLat([landing.lng, landing.lat])
      .setPopup(landingPopup)
      .addTo(map);

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([launch.lng, launch.lat]);
    bounds.extend([landing.lng, landing.lat]);

    map.fitBounds(bounds, {
      padding: 60,
      duration: 600,
      maxZoom: 12,
    });
  }, [landing.lat, landing.lng, landing.name, launch.lat, launch.lng, launch.name]);

  if (!token) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-500">지도 미리보기</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Mapbox 토큰이 없어서 실제 지도를 띄우지 못했습니다. `.env.local`의
          `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`을 사용하면 신규 활공장의
          이륙장/랜딩장 위치를 여기서 바로 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <div>
          <p className="text-sm font-semibold text-stone-500">지도 미리보기</p>
          <p className="text-sm text-stone-700">
            {readOnly
              ? "이륙장과 랜딩장 위치를 읽기 전용으로 확인합니다."
              : `지도를 움직인 뒤 클릭하면 현재 선택한 ${activeTarget === "launch" ? "TakeOff" : "Landing"} 좌표와 지형 고도가 폼에 반영됩니다.`}
          </p>
        </div>
        <div className="text-right text-xs font-medium text-stone-500">
          <p className="font-semibold text-stone-700">
            현재 클릭 대상 {activeTarget === "launch" ? "TakeOff" : "Landing"}
          </p>
          <p>이륙장 {launch.lat.toFixed(5)}, {launch.lng.toFixed(5)}</p>
          <p>랜딩장 {landing.lat.toFixed(5)}, {landing.lng.toFixed(5)}</p>
        </div>
      </div>
      <div ref={containerRef} className="h-[320px] overflow-hidden rounded-[22px]" />
    </div>
  );
}
