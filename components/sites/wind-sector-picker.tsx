"use client";

import type { SiteConfig, WindDirection } from "@/types/site";
import { windDirectionOptions } from "@/types/site-registration";

type PreferredWindBucket = keyof SiteConfig["preferredWind"];

type WindSectorPickerProps = {
  value: SiteConfig["preferredWind"];
  mode: "interactive" | "readonly";
  activeBucket?: PreferredWindBucket;
  onActiveBucketChange?: (bucket: PreferredWindBucket) => void;
  onChange?: (nextValue: SiteConfig["preferredWind"]) => void;
  title: string;
  description: string;
  actualDirection?: WindDirection;
  actualDirectionLabel?: string;
};

const bucketMeta: Record<
  PreferredWindBucket,
  { label: string; fill: string; stroke: string; text: string }
> = {
  best: {
    label: "Best",
    fill: "#d1fae5",
    stroke: "#10b981",
    text: "#065f46",
  },
  conditional: {
    label: "Conditional",
    fill: "#dbeafe",
    stroke: "#3b82f6",
    text: "#1d4ed8",
  },
  caution: {
    label: "Caution",
    fill: "#fef3c7",
    stroke: "#f59e0b",
    text: "#92400e",
  },
  reject: {
    label: "Reject",
    fill: "#fee2e2",
    stroke: "#ef4444",
    text: "#991b1b",
  },
};

const orderedBuckets: PreferredWindBucket[] = [
  "best",
  "conditional",
  "caution",
  "reject",
];

export function WindSectorPicker({
  value,
  mode,
  activeBucket = "best",
  onActiveBucketChange,
  onChange,
  title,
  description,
  actualDirection,
  actualDirectionLabel = "실제 예보 풍향",
}: WindSectorPickerProps) {
  function getBucket(direction: WindDirection): PreferredWindBucket | null {
    for (const bucket of orderedBuckets) {
      if (value[bucket].includes(direction)) {
        return bucket;
      }
    }

    return null;
  }

  function toggleDirection(direction: WindDirection) {
    if (mode !== "interactive" || !onChange) {
      return;
    }

    const currentBucket = getBucket(direction);
    const nextValue: SiteConfig["preferredWind"] = {
      best: [...value.best],
      conditional: [...value.conditional],
      caution: [...value.caution],
      reject: [...value.reject],
    };

    orderedBuckets.forEach((bucket) => {
      nextValue[bucket] = nextValue[bucket].filter((item) => item !== direction);
    });

    if (currentBucket !== activeBucket) {
      nextValue[activeBucket] = [...nextValue[activeBucket], direction];
    }

    onChange({
      best: sortDirections(nextValue.best),
      conditional: sortDirections(nextValue.conditional),
      caution: sortDirections(nextValue.caution),
      reject: sortDirections(nextValue.reject),
    });
  }

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-500">{title}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        {mode === "interactive" ? (
          <div className="flex flex-wrap gap-2">
            {orderedBuckets.map((bucket) => (
              <button
                key={bucket}
                type="button"
                onClick={() => onActiveBucketChange?.(bucket)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor:
                    activeBucket === bucket ? bucketMeta[bucket].fill : "#ffffff",
                  borderColor: bucketMeta[bucket].stroke,
                  color: bucketMeta[bucket].text,
                }}
              >
                {bucketMeta[bucket].label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr] lg:items-center">
        <div className="mx-auto w-full max-w-[280px]">
          <svg viewBox="0 0 280 280" className="w-full">
            <circle cx="140" cy="140" r="100" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="1.5" />
            <circle cx="140" cy="140" r="54" fill="#ffffff" stroke="#e7e5e4" strokeWidth="1.5" />

            {windDirectionOptions.map((direction, index) => {
              const startAngle = -90 + index * 22.5 - 11.25;
              const endAngle = startAngle + 22.5;
              const bucket = getBucket(direction);
              const meta = bucket ? bucketMeta[bucket] : null;
              const outerPath = describeSector(140, 140, 58, 98, startAngle, endAngle);
              const labelPosition = polarToCartesian(140, 140, 117, startAngle + 11.25);

              return (
                <g key={direction}>
                  <path
                    d={outerPath}
                    fill={meta?.fill ?? "#f5f5f4"}
                    stroke={meta?.stroke ?? "#d6d3d1"}
                    strokeWidth={bucket ? 2 : 1}
                    className={mode === "interactive" ? "cursor-pointer" : ""}
                    onClick={() => toggleDirection(direction)}
                  />
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={meta?.text ?? "#57534e"}
                    className={mode === "interactive" ? "pointer-events-none" : ""}
                  >
                    {direction}
                  </text>
                </g>
              );
            })}

            {actualDirection ? (
              <g>
                <defs>
                  <marker
                    id="actual-wind-arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="7"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,7 L7,3.5 z" fill="#111827" />
                  </marker>
                </defs>
                <line
                  x1={polarToCartesian(
                    140,
                    140,
                    132,
                    directionToAngle(actualDirection)
                  ).x}
                  y1={polarToCartesian(
                    140,
                    140,
                    132,
                    directionToAngle(actualDirection)
                  ).y}
                  x2={polarToCartesian(
                    140,
                    140,
                    18,
                    directionToAngle(actualDirection)
                  ).x}
                  y2={polarToCartesian(
                    140,
                    140,
                    18,
                    directionToAngle(actualDirection)
                  ).y}
                  stroke="#111827"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  markerEnd="url(#actual-wind-arrow)"
                />
              </g>
            ) : null}

            <text
              x="140"
              y="128"
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#1c1917"
            >
              {mode === "interactive"
                ? `${bucketMeta[activeBucket].label} 입력`
                : "실제 표시 예시"}
            </text>
            <text
              x="140"
              y="150"
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#78716c"
            >
              {mode === "interactive"
                ? "섹터 클릭으로 채우기"
                : actualDirection
                  ? `${actualDirectionLabel}: ${actualDirection}`
                  : "색상으로 풍향 구분"}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          {orderedBuckets.map((bucket) => (
            <div
              key={bucket}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: bucketMeta[bucket].stroke,
                backgroundColor: bucketMeta[bucket].fill,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className="text-sm font-semibold"
                  style={{ color: bucketMeta[bucket].text }}
                >
                  {bucketMeta[bucket].label}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: bucketMeta[bucket].text }}
                >
                  {value[bucket].length}개
                </p>
              </div>
              <p className="mt-2 text-sm text-stone-700">
                {value[bucket].length > 0 ? value[bucket].join(", ") : "선택 없음"}
              </p>
            </div>
          ))}
          {actualDirection ? (
            <div className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{actualDirectionLabel}</p>
                <p className="text-xs font-medium text-stone-300">포인터 표시</p>
              </div>
              <p className="mt-2 text-sm text-stone-100">{actualDirection}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function sortDirections(directions: WindDirection[]) {
  return [...directions].sort(
    (a, b) => windDirectionOptions.indexOf(a) - windDirectionOptions.indexOf(b)
  );
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeSector(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function directionToAngle(direction: WindDirection) {
  return -90 + windDirectionOptions.indexOf(direction) * 22.5;
}
