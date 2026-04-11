"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { TaskPointType } from "@/types/course";

type TerrainProfileSample = {
  distanceKm: number;
  elevationM: number | null;
  segmentIndex: number;
};

type SegmentProfile = {
  id: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  minElevationM: number | null;
  maxElevationM: number | null;
  gainM: number;
  lossM: number;
};

type TaskElevationProfileProps = {
  samples: TerrainProfileSample[];
  segments: SegmentProfile[];
  waypoints: Array<{
    label: string;
    fullLabel?: string;
    distanceKm: number;
    taskType: TaskPointType;
  }>;
  baseAltitudeM: number;
};

export function TaskElevationProfile({
  samples,
  segments,
  waypoints,
  baseAltitudeM,
}: TaskElevationProfileProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredDistanceKm, setHoveredDistanceKm] = useState<number | null>(null);
  const validSamples = samples.filter(
    (sample): sample is TerrainProfileSample & { elevationM: number } =>
      typeof sample.elevationM === "number"
  );

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === sectionRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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

  if (validSamples.length < 2) {
    return (
      <div className="rounded-2xl bg-stone-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          고도 프로파일
        </p>
        <p className="mt-2 text-sm text-stone-600">
          지형 고도 샘플을 불러오는 중입니다.
        </p>
      </div>
    );
  }

  const chartWidth = 760;
  const chartHeight = 220;
  const paddingX = 16;
  const paddingY = 18;
  const minElevation = Math.min(...validSamples.map((sample) => sample.elevationM));
  const maxElevation = Math.max(...validSamples.map((sample) => sample.elevationM));
  const elevationRange = Math.max(1, maxElevation - minElevation);
  const totalDistance = Math.max(
    0.1,
    validSamples[validSamples.length - 1]?.distanceKm ?? 0.1
  );

  const points = validSamples
    .map((sample) => {
      const x =
        paddingX +
        (sample.distanceKm / totalDistance) * (chartWidth - paddingX * 2);
      const y =
        chartHeight -
        paddingY -
        ((sample.elevationM - minElevation) / elevationRange) *
          (chartHeight - paddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = [
    `${paddingX},${chartHeight - paddingY}`,
    points,
    `${
      paddingX +
      (validSamples[validSamples.length - 1].distanceKm / totalDistance) *
        (chartWidth - paddingX * 2)
    },${chartHeight - paddingY}`,
  ].join(" ");

  const waypointMarkers = waypoints.map((waypoint, index) => {
    const x =
      paddingX +
      (waypoint.distanceKm / totalDistance) * (chartWidth - paddingX * 2);

    return {
      ...waypoint,
      x,
      labelY: 20 + (index % 2) * 16,
    };
  });

  const baseLineY =
    chartHeight -
    paddingY -
    ((baseAltitudeM - minElevation) / elevationRange) *
      (chartHeight - paddingY * 2);

  const chartPoints = validSamples.map((sample) => {
    const x =
      paddingX +
      (sample.distanceKm / totalDistance) * (chartWidth - paddingX * 2);
    const y =
      chartHeight -
      paddingY -
      ((sample.elevationM - minElevation) / elevationRange) *
        (chartHeight - paddingY * 2);

    return {
      ...sample,
      x,
      y,
    };
  });

  const hoveredPoint =
    hoveredDistanceKm == null
      ? null
      : (() => {
          if (chartPoints.length === 0) {
            return null;
          }

          if (hoveredDistanceKm <= chartPoints[0].distanceKm) {
            return chartPoints[0];
          }

          const lastPoint = chartPoints[chartPoints.length - 1];

          if (hoveredDistanceKm >= lastPoint.distanceKm) {
            return lastPoint;
          }

          for (let index = 1; index < chartPoints.length; index += 1) {
            const prev = chartPoints[index - 1];
            const next = chartPoints[index];

            if (hoveredDistanceKm > next.distanceKm) {
              continue;
            }

            const distanceSpan = Math.max(0.0001, next.distanceKm - prev.distanceKm);
            const ratio = (hoveredDistanceKm - prev.distanceKm) / distanceSpan;

            return {
              distanceKm: hoveredDistanceKm,
              elevationM: prev.elevationM + (next.elevationM - prev.elevationM) * ratio,
              segmentIndex: prev.segmentIndex,
              x: prev.x + (next.x - prev.x) * ratio,
              y: prev.y + (next.y - prev.y) * ratio,
            };
          }

          return lastPoint;
        })();

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const ctm = svg.getScreenCTM();

    if (!ctm) {
      return;
    }

    const cursorPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      ctm.inverse()
    );
    const clampedChartX = Math.min(
      chartWidth - paddingX,
      Math.max(paddingX, cursorPoint.x)
    );
    const normalizedChartX =
      (clampedChartX - paddingX) / (chartWidth - paddingX * 2);
    const distanceKm = normalizedChartX * totalDistance;

    setHoveredDistanceKm(distanceKm);
  }

  return (
    <div
      ref={sectionRef}
      className={`rounded-2xl bg-stone-100 p-4 ${
        isFullscreen ? "h-screen overflow-y-auto rounded-none bg-stone-100 p-6" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          전체 타스크 고도 프로파일
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-stone-600">
            최저 {Math.round(minElevation)}m / 최고 {Math.round(maxElevation)}m / 베이스{" "}
            {Math.round(baseAltitudeM)}m
          </p>
          <button
            type="button"
            onClick={() => {
              void toggleFullscreen();
            }}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
          >
            {isFullscreen ? "전체 보기 닫기" : "프로파일 전체 보기"}
          </button>
        </div>
      </div>

      <div
        className={`mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 ${
          isFullscreen ? "min-h-[340px]" : ""
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className={`w-full ${isFullscreen ? "h-[360px]" : "h-[220px]"}`}
          role="img"
          aria-label="타스크 고도 프로파일"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredDistanceKm(null)}
        >
          <defs>
            <linearGradient id="profile-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <line
            x1={paddingX}
            y1={paddingY}
            x2={paddingX}
            y2={chartHeight - paddingY}
            stroke="#d6d3d1"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#d6d3d1"
            strokeWidth="1"
          />
          {baseLineY >= paddingY && baseLineY <= chartHeight - paddingY ? (
            <>
              <line
                x1={paddingX}
                y1={baseLineY}
                x2={chartWidth - paddingX}
                y2={baseLineY}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={chartWidth - paddingX}
                y={Math.max(paddingY + 10, baseLineY - 6)}
                textAnchor="end"
                fontSize="11"
                fontWeight="700"
                fill="#dc2626"
              >
                BASE {Math.round(baseAltitudeM)}m
              </text>
            </>
          ) : null}
          <polygon points={areaPoints} fill="url(#profile-fill)" />
          {waypointMarkers.map((waypoint) => (
            <g key={`${waypoint.label}-${waypoint.distanceKm}`}>
              <line
                x1={waypoint.x}
                y1={paddingY}
                x2={waypoint.x}
                y2={chartHeight - paddingY}
                stroke={taskTypeColor(waypoint.taskType)}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <circle
                cx={waypoint.x}
                cy={chartHeight - paddingY}
                r="3"
                fill={taskTypeColor(waypoint.taskType)}
              />
              <text
                x={waypoint.x}
                y={waypoint.labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={taskTypeColor(waypoint.taskType)}
              >
                {isFullscreen ? waypoint.fullLabel ?? waypoint.label : waypoint.label}
              </text>
            </g>
          ))}
          {hoveredPoint ? (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingY}
                x2={hoveredPoint.x}
                y2={chartHeight - paddingY}
                stroke="#0f172a"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill="#ffffff"
                stroke="#0f766e"
                strokeWidth="3"
              />
            </g>
          ) : null}
          <polyline
            points={points}
            fill="none"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="mt-2 flex items-center justify-between text-xs font-medium text-stone-500">
          <span>0km</span>
          <span>
            {hoveredPoint
              ? `${hoveredPoint.distanceKm.toFixed(1)}km / ${Math.round(
                  hoveredPoint.elevationM
                )}m`
              : "라인에 마우스를 올리면 거리/고도 표시"}
          </span>
          <span>{totalDistance.toFixed(1)}km</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          웨이포인트 구간별 프로파일
        </p>
        {segments.map((segment) => (
          <div key={segment.id} className="rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">
                  {segment.fromLabel} {"->"} {segment.toLabel}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  구간 거리 {segment.distanceKm.toFixed(1)}km
                </p>
              </div>
              <div className="text-right text-xs font-medium text-stone-500">
                <p>
                  최저{" "}
                  {segment.minElevationM != null
                    ? `${Math.round(segment.minElevationM)}m`
                    : "-"}
                </p>
                <p>
                  최고{" "}
                  {segment.maxElevationM != null
                    ? `${Math.round(segment.maxElevationM)}m`
                    : "-"}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                누적 상승 +{Math.round(segment.gainM)}m
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                누적 하강 -{Math.round(segment.lossM)}m
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function taskTypeColor(taskType: TaskPointType) {
  switch (taskType) {
    case "start":
      return "#2563eb";
    case "ess":
      return "#f59e0b";
    case "goal":
      return "#16a34a";
    default:
      return "#475569";
  }
}
