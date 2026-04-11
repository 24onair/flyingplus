"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseMapPlaceholder } from "@/components/briefing/course-map-placeholder";
import { TaskElevationProfile } from "@/components/briefing/task-elevation-profile";
import { WeatherDebugCard } from "@/components/briefing/weather-debug-card";
import { XctskQrModal } from "@/components/briefing/xctsk-qr-modal";
import { SelectedDateCard } from "@/components/cards/selected-date-card";
import { useAuth } from "@/components/auth/auth-provider";
import { buildCupTaskFile } from "@/lib/export/cup";
import { buildXctskTaskFile } from "@/lib/export/xctsk";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { buildBriefingRequest } from "@/lib/request/build-briefing-request";
import { computeTaskPath } from "@/lib/task/task-geometry";
import type {
  TaskPointType,
  WaypointCategory,
  WaypointRecord,
} from "@/types/course";
import type { FlightBriefingResponse } from "@/types/briefing";
import type { SavedTaskVisibility } from "@/types/saved-task";

type CoursesClientProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

type EditableTurnpoint = {
  order: number;
  name: string;
  label?: string;
  lat?: number;
  lng?: number;
  radiusM: number;
  taskType: TaskPointType;
};

type TaskApiResponse = {
  task?: { id: string };
  error?: string;
  details?: string;
};

const taskPointTypeOptions: Array<{ value: TaskPointType; label: string }> = [
  { value: "start", label: "TakeOff" },
  { value: "sss", label: "SSS" },
  { value: "turnpoint", label: "턴포인트" },
  { value: "ess", label: "ESS" },
  { value: "goal", label: "골" },
];

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

function normalizeTurnpoints(turnpoints: EditableTurnpoint[]) {
  return turnpoints.map((turnpoint, index, all) => ({
    ...turnpoint,
    order: index + 1,
    taskType: defaultTaskPointType(index + 1, all.length),
  }));
}

function defaultRadiusM(order: number) {
  return order === 1 ? 200 : 400;
}

function defaultTaskPointType(order: number, total: number): TaskPointType {
  if (order === 1) {
    return "start";
  }

  if (order === 2 && total >= 3) {
    return "sss";
  }

  if (order === total) {
    return "goal";
  }

  if (total >= 3 && order === total - 1) {
    return "ess";
  }

  return "turnpoint";
}

function buildCustomPointMeta(current: Array<{ name: string }>) {
  let sequence = 1;

  while (
    current.some((point) => point.name === `CUST${String(sequence).padStart(2, "0")}`)
  ) {
    sequence += 1;
  }

  return {
    code: `CUST${String(sequence).padStart(2, "0")}`,
    label: `Custom Point ${sequence}`,
  };
}

function getTaskApiUrl() {
  if (typeof window === "undefined") {
    return "/api/tasks";
  }

  return new URL("/api/tasks", window.location.origin).toString();
}

async function readTaskApiResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("서버가 JSON이 아닌 응답을 반환했습니다. 서버 상태를 다시 확인해 주세요.");
  }

  try {
    return JSON.parse(raw) as TaskApiResponse;
  } catch {
    throw new Error("서버 JSON 응답을 해석하지 못했습니다.");
  }
}

export function CoursesClient({ searchParams }: CoursesClientProps) {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, getAccessToken } = useAuth();
  const request = useMemo(() => buildBriefingRequest(searchParams), [searchParams]);
  const [briefing, setBriefing] = useState<FlightBriefingResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [editableTurnpoints, setEditableTurnpoints] = useState<EditableTurnpoint[]>([]);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [sssOpenTime, setSssOpenTime] = useState("12:00");
  const [taskDeadlineTime, setTaskDeadlineTime] = useState("23:00");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [taskVisibility, setTaskVisibility] = useState<SavedTaskVisibility>("private");
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [terrainElevations, setTerrainElevations] = useState<
    Array<{
      order: number;
      elevationM: number | null;
    }>
  >([]);
  const [terrainProfileSamples, setTerrainProfileSamples] = useState<
    Array<{
      distanceKm: number;
      elevationM: number | null;
      segmentIndex: number;
    }>
  >([]);
  const [waypointDatabase, setWaypointDatabase] = useState<WaypointRecord[]>([]);
  const plan = briefing?.recommendedPlan ?? null;
  const bestSiteId = briefing?.summary.bestSiteId ?? null;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      setError("");

      try {
        const response = await fetch("/api/briefings/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "코스 생성에 실패했습니다.");
        }

        const payload = (await response.json()) as FlightBriefingResponse;
        if (!cancelled) {
          setBriefing(payload);
          setEditableTurnpoints(
            payload.recommendedPlan.turnpoints.map((turnpoint, index) => ({
              ...turnpoint,
              radiusM: defaultRadiusM(index + 1),
              taskType: defaultTaskPointType(
                index + 1,
                payload.recommendedPlan.turnpoints.length
              ),
            }))
          );
          setSssOpenTime("12:00");
          setTaskDeadlineTime("23:00");
          setTerrainElevations([]);
          setTerrainProfileSamples([]);
          setStatus("done");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "알 수 없는 오류");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    async function loadWaypoints() {
      if (!bestSiteId) {
        setWaypointDatabase([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/sites/waypoints?siteId=${encodeURIComponent(bestSiteId)}`
        );

        if (!response.ok) {
          throw new Error("웨이포인트 로드 실패");
        }

        const payload = (await response.json()) as {
          waypoints?: WaypointRecord[];
        };

        if (!cancelled) {
          setWaypointDatabase(payload.waypoints ?? []);
        }
      } catch {
        if (!cancelled) {
          setWaypointDatabase([]);
        }
      }
    }

    void loadWaypoints();

    return () => {
      cancelled = true;
    };
  }, [bestSiteId]);

  const waypointCounts = useMemo(
    () =>
      waypointDatabase.reduce<Record<WaypointCategory, number>>(
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
    [waypointDatabase]
  );

  const editableDistanceKm = useMemo(() => {
    const points = editableTurnpoints.filter(
      (
        point
      ): point is EditableTurnpoint & {
        lat: number;
        lng: number;
      } => typeof point.lat === "number" && typeof point.lng === "number"
    );

    if (points.length < 2) {
      return 0;
    }

    return points.slice(1).reduce((total, point, index) => {
      return total + haversineDistanceKm(points[index], point);
    }, 0);
  }, [editableTurnpoints]);

  const taskDistanceKm = useMemo(() => {
    const points = editableTurnpoints.filter(
      (
        point
      ): point is EditableTurnpoint & {
        lat: number;
        lng: number;
      } => typeof point.lat === "number" && typeof point.lng === "number"
    );

    if (points.length < 2) {
      return 0;
    }

    return computeTaskPath(
      points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        radiusM: point.radiusM,
      }))
    ).distanceKm;
  }, [editableTurnpoints]);

  const cupFileContent = useMemo(
    () =>
      buildCupTaskFile({
        taskName: plan?.courseName ?? "XC Task",
        taskDistanceKm,
        turnpoints: editableTurnpoints,
        waypointDatabase,
      }),
    [editableTurnpoints, plan?.courseName, taskDistanceKm, waypointDatabase]
  );

  const xctskFileContent = useMemo(
    () =>
      buildXctskTaskFile({
        turnpoints: editableTurnpoints.map((turnpoint) => ({
          ...turnpoint,
          elevationM:
            terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ??
            waypointDatabase.find((waypoint) => waypoint.code === turnpoint.name)?.elevationM ??
            null,
        })),
        sssOpenTime,
        taskDeadlineTime,
      }),
    [editableTurnpoints, terrainElevations, waypointDatabase, sssOpenTime, taskDeadlineTime]
  );

  const terrainSegmentProfiles = useMemo(
    () =>
      editableTurnpoints.slice(0, -1).map((turnpoint, index) => {
        const nextTurnpoint = editableTurnpoints[index + 1];
        const segmentSamples = terrainProfileSamples.filter(
          (sample): sample is typeof sample & { elevationM: number } =>
            sample.segmentIndex === index && typeof sample.elevationM === "number"
        );

        let gainM = 0;
        let lossM = 0;

        segmentSamples.forEach((sample, sampleIndex) => {
          if (sampleIndex === 0) {
            return;
          }

          const prev = segmentSamples[sampleIndex - 1];
          const delta = sample.elevationM - prev.elevationM;

          if (delta > 0) {
            gainM += delta;
          } else {
            lossM += Math.abs(delta);
          }
        });

        const firstDistance = segmentSamples[0]?.distanceKm ?? 0;
        const lastDistance = segmentSamples[segmentSamples.length - 1]?.distanceKm ?? 0;

        return {
          id: `${turnpoint.order}-${nextTurnpoint.order}`,
          fromLabel: turnpoint.label
            ? `${turnpoint.name} / ${turnpoint.label}`
            : turnpoint.name,
          toLabel: nextTurnpoint.label
            ? `${nextTurnpoint.name} / ${nextTurnpoint.label}`
            : nextTurnpoint.name,
          distanceKm: Math.max(0, lastDistance - firstDistance),
          minElevationM:
            segmentSamples.length > 0
              ? Math.min(...segmentSamples.map((sample) => sample.elevationM))
              : null,
          maxElevationM:
            segmentSamples.length > 0
              ? Math.max(...segmentSamples.map((sample) => sample.elevationM))
              : null,
          gainM,
          lossM,
        };
      }),
    [editableTurnpoints, terrainProfileSamples]
  );

  const terrainProfileWaypoints = useMemo(() => {
    return editableTurnpoints.map((turnpoint, index) => {
      if (index === 0) {
        return {
          label: turnpoint.name,
          fullLabel: turnpoint.label
            ? `${turnpoint.name} / ${turnpoint.label}`
            : turnpoint.name,
          distanceKm: 0,
          taskType: turnpoint.taskType,
        };
      }

      const segmentSamples = terrainProfileSamples.filter(
        (sample) => sample.segmentIndex === index - 1
      );

      return {
        label: turnpoint.name,
        fullLabel: turnpoint.label
          ? `${turnpoint.name} / ${turnpoint.label}`
          : turnpoint.name,
        distanceKm:
          segmentSamples[segmentSamples.length - 1]?.distanceKm ??
          terrainProfileSamples[terrainProfileSamples.length - 1]?.distanceKm ??
          0,
        taskType: turnpoint.taskType,
      };
    });
  }, [editableTurnpoints, terrainProfileSamples]);

  if (status === "loading") {
    return (
      <div className="glass rounded-[28px] border p-6">
        <p className="text-sm font-semibold text-stone-500">코스 생성 중</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">
          추천 지역의 메인 코스와 병목 구간을 구성하고 있습니다.
        </h1>
      </div>
    );
  }

  if (status === "error" || !briefing) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">코스 생성 실패</p>
        <p className="mt-2 text-base font-medium text-red-900">{error}</p>
      </div>
    );
  }

  function handleWaypointSelect(waypoint: WaypointRecord) {
    setEditableTurnpoints((current) => {
      return normalizeTurnpoints([
        ...current,
        {
          order: current.length + 1,
          name: waypoint.code,
          label: waypoint.label,
          lat: waypoint.lat,
          lng: waypoint.lng,
          radiusM: 400,
          taskType: current.length === 0 ? "start" : "turnpoint",
        },
      ]);
    });
  }

  function handleCustomPointCreate(point: {
    lat: number;
    lng: number;
    elevationM: number | null;
  }) {
    setEditableTurnpoints((current) => {
      const customMeta = buildCustomPointMeta(current);

      return normalizeTurnpoints([
        ...current,
        {
          order: current.length + 1,
          name: customMeta.code,
          label: customMeta.label,
          lat: point.lat,
          lng: point.lng,
          radiusM: 400,
          taskType: current.length === 0 ? "start" : "turnpoint",
        },
      ]);
    });
  }

  function handleRemoveTurnpoint(order: number) {
    setEditableTurnpoints((current) =>
      normalizeTurnpoints(current.filter((turnpoint) => turnpoint.order !== order))
    );
  }

  function moveTurnpoint(order: number, direction: "up" | "down") {
    setEditableTurnpoints((current) => {
      const index = current.findIndex((turnpoint) => turnpoint.order === order);

      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [picked] = next.splice(index, 1);
      next.splice(targetIndex, 0, picked);
      return normalizeTurnpoints(next);
    });
  }

  function resetRoute() {
    if (!plan) {
      return;
    }

    setEditableTurnpoints(
      plan.turnpoints.map((turnpoint, index) => ({
        ...turnpoint,
        radiusM: defaultRadiusM(index + 1),
        taskType: defaultTaskPointType(index + 1, plan.turnpoints.length),
      }))
    );
    setSssOpenTime("12:00");
    setTaskDeadlineTime("23:00");
    setTerrainElevations([]);
    setTerrainProfileSamples([]);
  }

  function updateTurnpointRadius(order: number, radiusM: number) {
    setEditableTurnpoints((current) =>
      current.map((turnpoint) =>
        turnpoint.order === order ? { ...turnpoint, radiusM } : turnpoint
      )
    );
  }

  function updateTurnpointType(order: number, taskType: TaskPointType) {
    setEditableTurnpoints((current) =>
      current.map((turnpoint) =>
        turnpoint.order === order ? { ...turnpoint, taskType } : turnpoint
      )
    );
  }

  function exportCup() {
    const safeDate = request.date.replaceAll("-", "");
    const safeSite = (briefing?.summary.bestSiteId ?? "task").replace(/[^a-z0-9-]/gi, "-");
    const safeCourseName = (plan?.courseName ?? "custom-task")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_가-힣]/g, "");
    const fileName = `${safeDate}_${safeSite}_${safeCourseName}.cup`;
    const blob = new Blob([cupFileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportXctsk() {
    const safeDate = request.date.replaceAll("-", "");
    const safeSite = (briefing?.summary.bestSiteId ?? "task").replace(/[^a-z0-9-]/gi, "-");
    const safeCourseName = (plan?.courseName ?? "custom-task")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_가-힣]/g, "");
    const fileName = `${safeDate}_${safeSite}_${safeCourseName}.xctsk`;
    const blob = new Blob([xctskFileContent], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openXctskQr() {
    setIsQrOpen(true);
  }

  async function saveCurrentTask() {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!canUsePersonalStorage(profile)) {
      setSaveStatus("error");
      setSaveError("관리자 승인 후 개인 타스크 저장을 사용할 수 있습니다.");
      return;
    }

    if (!briefing || editableTurnpoints.length < 2) {
      return;
    }

    if (saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");
    setSaveError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(getTaskApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: plan?.courseName ?? "Saved Task",
          visibility: taskVisibility,
          siteId: briefing.summary.bestSiteId,
          siteName: briefing.summary.bestSiteName,
          date: request.date,
          taskType: "RACE",
          sssOpenTime,
          taskDeadlineTime,
          distanceKm: taskDistanceKm,
          turnpoints: editableTurnpoints
            .filter(
              (
                turnpoint
              ): turnpoint is EditableTurnpoint & { lat: number; lng: number } =>
                typeof turnpoint.lat === "number" && typeof turnpoint.lng === "number"
            )
            .map((turnpoint) => ({
              ...turnpoint,
              elevationM:
                terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ??
                waypointDatabase.find((waypoint) => waypoint.code === turnpoint.name)?.elevationM ??
                null,
            })),
        }),
      });

      const payload = await readTaskApiResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? payload.details ?? "타스크 저장 실패");
      }

      setSavedTaskId(payload.task?.id ?? null);
      setSaveStatus("done");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "알 수 없는 오류");
    }
  }

  const saveButtonLabel = authLoading
    ? "계정 확인 중..."
    : !user
      ? "로그인 후 저장"
      : !canUsePersonalStorage(profile)
        ? "승인 후 저장 가능"
        : saveStatus === "saving"
          ? "저장 중..."
          : saveStatus === "done"
            ? "저장 완료"
            : "타스크 저장";

  if (!plan || !briefing) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">코스 데이터 없음</p>
        <p className="mt-2 text-base font-medium text-red-900">
          추천 코스 데이터를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <XctskQrModal
        open={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        xctskContent={xctskFileContent}
        taskName={plan.courseName}
      />

      <SelectedDateCard
        date={request.date}
        label="코스 기준 날짜"
        tone="accent"
      />

      <div className="glass rounded-[28px] border p-5">
        <p className="text-sm font-semibold text-stone-500">추천 결과 기준</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">
          {briefing.summary.bestSiteName} / {plan.courseName}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {request.dataSource === "open_meteo" ? "Open-Meteo 자동 예보" : "수동 입력"} 기준으로 계산된 메인 코스와 핵심 경고를 보여줍니다.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          지상풍 {request.weatherInput.surfaceWindDir} {request.weatherInput.surfaceWindKmh}km/h / 써멀{" "}
          {request.weatherInput.thermalMaxMs}m/s / 베이스 {request.weatherInput.baseM}m
        </p>
      </div>
      <WeatherDebugCard debug={briefing.debug} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.8fr]">
        <CourseMapPlaceholder
          courseName={plan.courseName}
          siteName={briefing.summary.bestSiteName}
          route={editableTurnpoints}
          bottlenecks={briefing.bottlenecks}
          waypoints={waypointDatabase}
          onWaypointSelect={waypointDatabase.length > 0 ? handleWaypointSelect : undefined}
          onCustomPointCreate={handleCustomPointCreate}
          editableDistanceKm={editableDistanceKm}
          editableTurnpoints={editableTurnpoints}
          terrainElevations={terrainElevations}
          onMoveTurnpoint={moveTurnpoint}
          onRemoveTurnpoint={handleRemoveTurnpoint}
          onResetRoute={resetRoute}
          taskDistanceKm={taskDistanceKm}
          onRadiusChange={updateTurnpointRadius}
          onTaskTypeChange={updateTurnpointType}
          sssOpenTime={sssOpenTime}
          taskDeadlineTime={taskDeadlineTime}
          onSssOpenTimeChange={setSssOpenTime}
          onTaskDeadlineTimeChange={setTaskDeadlineTime}
          onSaveTask={() => void saveCurrentTask()}
          onExportCup={exportCup}
          onExportXctsk={exportXctsk}
          onOpenXctskQr={openXctskQr}
          onTerrainElevationsChange={setTerrainElevations}
          onTerrainProfileChange={setTerrainProfileSamples}
        />
        <aside className="glass rounded-[28px] border p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-stone-500">코스 패널</p>
            <h2 className="text-2xl font-bold text-stone-900">{plan.courseName}</h2>
            <p className="text-sm leading-6 text-stone-600">
              추천 코스와 병목 구간을 함께 확인할 수 있게 구성했습니다.
            </p>
            {briefing.summary.bestSiteId === "mungyeong" ? (
              <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">
                  문경 WPT DB 연결 완료
                </p>
                <p className="mt-2">
                  `2024 Mungyeong Waypoints v3-geo.wpt` 전체를 불러와 지도에 표시합니다.
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  이륙장 {waypointCounts.launch} / 턴포인트 {waypointCounts.turnpoint} / 랜딩장{" "}
                  {waypointCounts.landing} / 참조점 {waypointCounts.reference}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                추천 이륙 시간
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900">
                {plan.launchWindow.start} - {plan.launchWindow.end}
              </p>
            </div>

            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                현재 코스 거리
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900">
                {editableDistanceKm.toFixed(1)}km
              </p>
              <p className="mt-1 text-sm text-stone-600">
                추천 코스 기준 {plan.distanceKm.expected}km / 범위 {plan.distanceKm.min}-{plan.distanceKm.max}km
              </p>
              <p className="mt-1 text-sm text-stone-600">
                써클 경계 기준 태스크 거리 {taskDistanceKm.toFixed(1)}km
              </p>
            </div>

            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                편집 중인 코스
              </p>
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">현재 타스크 저장</p>
                    <p className="mt-1 text-xs text-amber-800">
                      지금 편집 중인 타스크를 목록에 저장합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveCurrentTask()}
                    disabled={saveStatus === "saving"}
                    className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                {saveButtonLabel}
              </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={exportCup}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                >
                  현재 태스크 CUP 내보내기
                </button>
                <button
                  type="button"
                  onClick={exportXctsk}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                >
                  XCTrack 내보내기
                </button>
                <button
                  type="button"
                  onClick={openXctskQr}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                >
                  XCTrack QR
                </button>
                <button
                  type="button"
                  onClick={resetRoute}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                >
                  추천 코스로 되돌리기
                </button>
              </div>
              <div className="mt-3 grid gap-3 rounded-[24px] border border-stone-200 bg-white/80 p-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    SSS Open
                  </span>
                  <input
                    type="time"
                    value={sssOpenTime}
                    onChange={(event) => setSssOpenTime(event.target.value)}
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
                    onChange={(event) => setTaskDeadlineTime(event.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
                  />
                </label>
              </div>
              <div className="mt-3 rounded-[24px] border border-stone-200 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  공개 범위
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskVisibility("private")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      taskVisibility === "private"
                        ? "bg-stone-900 text-white"
                        : "border border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    나만 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskVisibility("public")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      taskVisibility === "public"
                        ? "bg-sky-600 text-white"
                        : "border border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    공개
                  </button>
                </div>
                <p className="mt-3 text-xs text-stone-500">
                  공개 타스크는 타스크 페이지의 공개 목록에서 다른 사용자도 볼 수 있습니다.
                </p>
              </div>
              {saveStatus === "done" && savedTaskId ? (
                <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  타스크를 저장했습니다.{" "}
                  <Link href={`/tasks/${savedTaskId}`} className="font-semibold underline">
                    저장된 타스크 보기
                  </Link>
                </div>
              ) : null}
              {saveStatus === "error" ? (
                <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
                  {saveError}
                </div>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm text-stone-700">
                {editableTurnpoints.map((turnpoint, index) => (
                  <li key={turnpoint.order} className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-900">
                      {turnpoint.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">
                        {turnpoint.label ? `${turnpoint.name} / ${turnpoint.label}` : turnpoint.name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-stone-500">
                        지형 고도:{" "}
                        {terrainElevations.find((item) => item.order === turnpoint.order)
                          ?.elevationM != null
                          ? `${Math.round(
                              terrainElevations.find((item) => item.order === turnpoint.order)
                                ?.elevationM ?? 0
                            )}m`
                          : "불러오는 중"}
                      </p>
                      <div className="mt-2">
                        <select
                          value={turnpoint.taskType}
                          onChange={(event) =>
                            updateTurnpointType(
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
                          value={turnpoint.radiusM}
                          onChange={(event) =>
                            updateTurnpointRadius(turnpoint.order, Number(event.target.value))
                          }
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={100}
                          step={50}
                          value={turnpoint.radiusM}
                          onChange={(event) =>
                            updateTurnpointRadius(
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
                        onClick={() => moveTurnpoint(turnpoint.order, "up")}
                        disabled={index === 0}
                        className="rounded-full border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        위
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTurnpoint(turnpoint.order, "down")}
                        disabled={index === editableTurnpoints.length - 1}
                        className="rounded-full border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        아래
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTurnpoint(turnpoint.order)}
                        className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                지도에서 웨이포인트를 클릭하면 코스 끝에 추가되고, 여기서 순서를 바꾸거나 삭제할 수 있습니다.
              </p>
            </div>

            <TaskElevationProfile
              samples={terrainProfileSamples}
              segments={terrainSegmentProfiles}
              waypoints={terrainProfileWaypoints}
              baseAltitudeM={request.weatherInput.baseM}
            />

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                핵심 경고
              </p>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {briefing.warnings.map((warning) => (
                  <li key={warning.code}>{warning.message}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                병목 구간
              </p>
              <div className="mt-3 space-y-3">
                {briefing.bottlenecks.map((bottleneck) => (
                  <div key={bottleneck.id} className="rounded-2xl bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-900">{bottleneck.name}</p>
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        {bottleneck.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{bottleneck.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
