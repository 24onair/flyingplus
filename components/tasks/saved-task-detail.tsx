"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { CourseMapPlaceholder } from "@/components/briefing/course-map-placeholder";
import { TaskElevationProfile } from "@/components/briefing/task-elevation-profile";
import { XctskQrModal } from "@/components/briefing/xctsk-qr-modal";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { buildLoginPath, withEmbedParam } from "@/lib/embed";
import { buildCupTaskFile } from "@/lib/export/cup";
import { buildWptWaypointFile } from "@/lib/export/wpt";
import { buildXctskTaskFile } from "@/lib/export/xctsk";
import { computeTaskPath } from "@/lib/task/task-geometry";
import type { TaskPointType, WaypointRecord } from "@/types/course";
import type { SavedTaskRecord, SavedTaskVisibility } from "@/types/saved-task";

type EditableTurnpoint = SavedTaskRecord["turnpoints"][number];

type TaskApiResponse = {
  task?: { id: string };
  error?: string;
  details?: string;
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

function isCustomTurnpoint(turnpoint: EditableTurnpoint) {
  return turnpoint.name.toUpperCase().startsWith("CUST");
}

function waypointCategoryFromTaskType(taskType: TaskPointType) {
  switch (taskType) {
    case "start":
      return "launch";
    case "goal":
      return "landing";
    default:
      return "turnpoint";
  }
}

function normalizeTurnpoints(turnpoints: EditableTurnpoint[]) {
  return turnpoints.map((turnpoint, index, all) => ({
    ...turnpoint,
    order: index + 1,
    taskType: defaultTaskPointType(index + 1, all.length),
  }));
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

export function SavedTaskDetail({
  task,
  embed = false,
  draftMode = false,
  autoOpenMapFullscreen = false,
  autoOpenProfileFullscreen = false,
}: {
  task: SavedTaskRecord;
  embed?: boolean;
  draftMode?: boolean;
  autoOpenMapFullscreen?: boolean;
  autoOpenProfileFullscreen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: authLoading, getAccessToken } = useAuth();
  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);
  const loginPath = useMemo(
    () => buildLoginPath(currentPath, embed),
    [currentPath, embed]
  );
  const topLevelMapFullscreenHref = useMemo(() => {
    if (!embed) {
      return undefined;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("embed");
    params.set("mapFullscreen", "1");
    const query = params.toString();

    return `${pathname}${query ? `?${query}` : ""}`;
  }, [embed, pathname, searchParams]);
  const topLevelProfileFullscreenHref = useMemo(() => {
    if (!embed) {
      return undefined;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("embed");
    params.delete("mapFullscreen");
    params.set("profileFullscreen", "1");
    const query = params.toString();

    return `${pathname}${query ? `?${query}` : ""}`;
  }, [embed, pathname, searchParams]);
  const canRenameOriginal =
    !draftMode && (Boolean(profile?.isAdmin) || user?.id === task.userId);
  const canDeleteTask = !draftMode && Boolean(profile?.isAdmin);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [taskName, setTaskName] = useState(draftMode ? task.name : `${task.name} 수정본`);
  const [editableTurnpoints, setEditableTurnpoints] = useState<EditableTurnpoint[]>(
    normalizeTurnpoints(task.turnpoints)
  );
  const [sssOpenTime, setSssOpenTime] = useState(task.sssOpenTime);
  const [taskDeadlineTime, setTaskDeadlineTime] = useState(task.taskDeadlineTime);
  const [taskVisibility, setTaskVisibility] = useState<SavedTaskVisibility>(task.visibility);
  const [terrainElevations, setTerrainElevations] = useState(
    task.turnpoints.map((turnpoint) => ({
      order: turnpoint.order,
      elevationM: turnpoint.elevationM,
    }))
  );
  const [terrainProfileSamples, setTerrainProfileSamples] = useState<
    Array<{
      distanceKm: number;
      elevationM: number | null;
      segmentIndex: number;
    }>
  >([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [renameStatus, setRenameStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");
  const [renameError, setRenameError] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");
  const [waypointDatabase, setWaypointDatabase] = useState<WaypointRecord[]>([]);
  const [waypointSaveStatus, setWaypointSaveStatus] = useState<Record<number, "idle" | "saving" | "done" | "error">>({});
  const [waypointSaveError, setWaypointSaveError] = useState<Record<number, string>>({});
  const emptyBottlenecks = useMemo(() => [], []);

  useEffect(() => {
    let cancelled = false;

    async function loadWaypoints() {
      try {
        const response = await fetch(
          `/api/sites/waypoints?siteId=${encodeURIComponent(task.siteId)}`
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
  }, [task.siteId]);

  const editableDistanceKm = useMemo(() => {
    if (editableTurnpoints.length < 2) {
      return 0;
    }

    return editableTurnpoints.slice(1).reduce((total, point, index) => {
      return total + haversineDistanceKm(editableTurnpoints[index], point);
    }, 0);
  }, [editableTurnpoints]);

  const taskDistanceKm = useMemo(() => {
    if (editableTurnpoints.length < 2) {
      return 0;
    }

    return computeTaskPath(
      editableTurnpoints.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        radiusM: point.radiusM,
      }))
    ).distanceKm;
  }, [editableTurnpoints]);

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

  const baseAltitudeM = useMemo(() => {
    return (
      terrainElevations.find((item) => item.order === 1)?.elevationM ??
      editableTurnpoints[0]?.elevationM ??
      0
    );
  }, [editableTurnpoints, terrainElevations]);

  const cupFileContent = useMemo(
    () =>
      buildCupTaskFile({
        taskName,
        taskDistanceKm,
        turnpoints: editableTurnpoints,
        waypointDatabase,
      }),
    [editableTurnpoints, taskDistanceKm, taskName, waypointDatabase]
  );

  const xctskFileContent = useMemo(
    () =>
      buildXctskTaskFile({
        turnpoints: editableTurnpoints.map((turnpoint) => ({
          ...turnpoint,
          elevationM:
            terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ??
            turnpoint.elevationM,
        })),
        sssOpenTime,
        taskDeadlineTime,
      }),
    [editableTurnpoints, sssOpenTime, taskDeadlineTime, terrainElevations]
  );
  const waypointSetFileContent = useMemo(
    () =>
      buildWptWaypointFile({
        turnpoints: editableTurnpoints.map((turnpoint) => ({
          ...turnpoint,
          elevationM:
            terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ??
            turnpoint.elevationM ??
            0,
        })),
      }),
    [editableTurnpoints, terrainElevations]
  );

  function exportCup() {
    downloadFile(
      cupFileContent,
      `${task.date.replaceAll("-", "")}_${taskName.replace(/\s+/g, "-")}.cup`,
      "text/plain;charset=utf-8"
    );
  }

  function exportXctsk() {
    downloadFile(
      xctskFileContent,
      `${task.date.replaceAll("-", "")}_${taskName.replace(/\s+/g, "-")}.xctsk`,
      "application/json;charset=utf-8"
    );
  }

  function exportWaypointSet() {
    downloadFile(
      waypointSetFileContent,
      `${task.date.replaceAll("-", "")}_${taskName.replace(/\s+/g, "-")}_waypoints.wpt`,
      "text/plain;charset=utf-8"
    );
  }

  function handleWaypointSelect(waypoint: WaypointRecord) {
    setEditableTurnpoints((current) =>
      normalizeTurnpoints([
        ...current,
        {
          order: current.length + 1,
          name: waypoint.code,
          label: waypoint.label,
          lat: waypoint.lat,
          lng: waypoint.lng,
          radiusM: 400,
          taskType: "turnpoint",
          elevationM: waypoint.elevationM,
        },
      ])
    );
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
          elevationM: point.elevationM,
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

  async function saveTurnpointAsWaypoint(turnpoint: EditableTurnpoint) {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push(loginPath);
      return;
    }

    if (!canUsePersonalStorage(profile)) {
      setWaypointSaveStatus((current) => ({ ...current, [turnpoint.order]: "error" }));
      setWaypointSaveError((current) => ({
        ...current,
        [turnpoint.order]: "관리자 승인 후 웨이포인트 저장을 사용할 수 있습니다.",
      }));
      return;
    }

    if (task.siteId === "manual") {
      setWaypointSaveStatus((current) => ({ ...current, [turnpoint.order]: "error" }));
      setWaypointSaveError((current) => ({
        ...current,
        [turnpoint.order]: "직접 입력 사이트는 웨이포인트를 저장할 수 없습니다.",
      }));
      return;
    }

    setWaypointSaveStatus((current) => ({ ...current, [turnpoint.order]: "saving" }));
    setWaypointSaveError((current) => ({ ...current, [turnpoint.order]: "" }));

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(loginPath);
        return;
      }

      const response = await fetch(`/api/sites/waypoints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          siteId: task.siteId,
          name: turnpoint.name,
          label: turnpoint.label,
          lat: turnpoint.lat,
          lng: turnpoint.lng,
          elevationM: turnpoint.elevationM,
          category: waypointCategoryFromTaskType(turnpoint.taskType),
        }),
      });

      const payload = response.headers.get("content-type")?.includes("application/json")
        ? ((await response.json()) as {
            error?: string;
            details?: string;
            waypoint?: WaypointRecord;
          })
        : null;

      if (!response.ok || !payload?.waypoint) {
        throw new Error(
          payload?.error ?? payload?.details ?? "웨이포인트 저장에 실패했습니다."
        );
      }

      setWaypointDatabase((current) => [...current, payload.waypoint as WaypointRecord]);
      setEditableTurnpoints((current) =>
        current.map((item) =>
          item.order === turnpoint.order
            ? {
                ...item,
                name: payload.waypoint?.code ?? item.name,
                label: payload.waypoint?.label ?? item.label,
                elevationM: payload.waypoint?.elevationM ?? item.elevationM,
              }
            : item
        )
      );
      setWaypointSaveStatus((current) => ({ ...current, [turnpoint.order]: "done" }));
    } catch (error) {
      setWaypointSaveStatus((current) => ({ ...current, [turnpoint.order]: "error" }));
      setWaypointSaveError((current) => ({
        ...current,
        [turnpoint.order]:
          error instanceof Error ? error.message : "웨이포인트 저장 중 오류가 발생했습니다.",
      }));
    }
  }

  async function saveAsNewTask() {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push(loginPath);
      return;
    }

    if (!canUsePersonalStorage(profile)) {
      setSaveStatus("error");
      setSaveError("관리자 승인 후 개인 타스크 저장을 사용할 수 있습니다.");
      return;
    }

    if (saveStatus === "saving" || editableTurnpoints.length < 2) {
      return;
    }

    setSaveStatus("saving");
    setSaveError("");
    setSavedTaskId(null);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(loginPath);
        return;
      }

      const response = await fetch(getTaskApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: taskName.trim() || `${task.name} 수정본`,
          visibility: taskVisibility,
          siteId: task.siteId,
          siteName: task.siteName,
          date: task.date,
          taskType: "RACE",
          sssOpenTime,
          taskDeadlineTime,
          distanceKm: taskDistanceKm,
          turnpoints: editableTurnpoints.map((turnpoint) => ({
            ...turnpoint,
            elevationM:
              terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ??
              turnpoint.elevationM,
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

  async function renameCurrentTask() {
    if (renameStatus === "saving" || !taskName.trim()) {
      return;
    }

    setRenameStatus("saving");
    setRenameError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(loginPath);
        return;
      }

      const response = await fetch(getTaskApiUrl(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          taskId: task.id,
          name: taskName.trim(),
        }),
      });

      const payload = await readTaskApiResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? payload.details ?? "타스크 이름 수정 실패");
      }

      setRenameStatus("done");
    } catch (error) {
      setRenameStatus("error");
      setRenameError(error instanceof Error ? error.message : "알 수 없는 오류");
    }
  }

  async function deleteCurrentTask() {
    const confirmed = window.confirm("이 타스크를 완전히 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setDeleteStatus("deleting");
    setDeleteError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(loginPath);
        return;
      }

      const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(task.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = response.headers.get("content-type")?.includes("application/json")
        ? ((await response.json()) as { error?: string; details?: string })
        : null;

      if (!response.ok) {
        throw new Error(payload?.error ?? payload?.details ?? "타스크 삭제 실패");
      }

      router.push(withEmbedParam("/tasks", embed));
      router.refresh();
    } catch (error) {
      setDeleteStatus("error");
      setDeleteError(error instanceof Error ? error.message : "알 수 없는 오류");
    }
  }

  return (
    <div
      className={embed || autoOpenMapFullscreen || autoOpenProfileFullscreen ? "space-y-4" : "space-y-6"}
    >
      <XctskQrModal
        open={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        xctskContent={xctskFileContent}
        taskName={taskName}
      />

      {!autoOpenMapFullscreen && !autoOpenProfileFullscreen ? (
        <div className={`glass border ${embed ? "rounded-[24px] p-4" : "rounded-[28px] p-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-500">
              {draftMode ? "신규 타스크 만들기" : embed ? "워드프레스 임베드" : "저장된 타스크 편집"}
            </p>
            <h1 className={`mt-1 font-bold text-stone-900 ${embed ? "text-2xl" : "text-3xl"}`}>
              {draftMode ? taskName : task.name}
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              {task.siteName} / {task.date} / {task.taskType}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canRenameOriginal && !embed ? (
              <button
                type="button"
                onClick={() => void renameCurrentTask()}
                disabled={renameStatus === "saving"}
                className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {renameStatus === "saving"
                  ? "이름 저장 중..."
                  : renameStatus === "done"
                    ? "이름 저장 완료"
                  : "현재 이름 저장"}
              </button>
            ) : null}
            <Link href={withEmbedParam("/tasks", embed)} className="btn btn-secondary">
              목록으로
            </Link>
          </div>
        </div>

        <div className={`flex flex-wrap gap-4 ${embed ? "mt-4" : "mt-6"}`}>
          <button
            type="button"
            onClick={exportCup}
            className="flex h-32 w-32 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 text-center text-2xl font-semibold leading-tight text-blue-700 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            현재 타스크 CUP 내보내기
          </button>
          <button
            type="button"
            onClick={exportXctsk}
            className="flex h-32 w-32 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-6 text-center text-2xl font-semibold leading-tight text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            XCTrack 내보내기
          </button>
          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="flex h-32 w-32 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-6 text-center text-2xl font-semibold leading-tight text-violet-700 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            XCTrack QR
          </button>
          <button
            type="button"
            onClick={exportWaypointSet}
            className="flex h-32 w-32 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-6 text-center text-2xl font-semibold leading-tight text-amber-700 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            웨이포인트 셋 내보내기
          </button>
        </div>
      </div>
      ) : null}

      <div className="grid min-h-[calc(100vh-220px)] gap-6 lg:grid-cols-[1.45fr_0.75fr]">
        <CourseMapPlaceholder
          courseName={taskName}
          siteName={task.siteName}
          route={editableTurnpoints}
          bottlenecks={emptyBottlenecks}
          waypoints={waypointDatabase}
          onWaypointSelect={waypointDatabase.length > 0 ? handleWaypointSelect : undefined}
          onCustomPointCreate={handleCustomPointCreate}
          editableDistanceKm={editableDistanceKm}
          editableTurnpoints={editableTurnpoints}
          terrainElevations={terrainElevations}
          onMoveTurnpoint={moveTurnpoint}
          onRemoveTurnpoint={handleRemoveTurnpoint}
          taskDistanceKm={taskDistanceKm}
          onRadiusChange={updateTurnpointRadius}
          onTaskTypeChange={updateTurnpointType}
          sssOpenTime={sssOpenTime}
          taskDeadlineTime={taskDeadlineTime}
          onSssOpenTimeChange={setSssOpenTime}
          onTaskDeadlineTimeChange={setTaskDeadlineTime}
          onSaveTask={() => void saveAsNewTask()}
          onExportCup={exportCup}
          onExportXctsk={exportXctsk}
          onOpenXctskQr={() => setIsQrOpen(true)}
          onTerrainElevationsChange={setTerrainElevations}
          onTerrainProfileChange={setTerrainProfileSamples}
          topLevelFullscreenHref={topLevelMapFullscreenHref}
          autoOpenFullscreen={autoOpenMapFullscreen}
        />

        <aside className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">편집 중인 타스크</p>

          <div className="mt-4 rounded-[24px] border border-stone-200 bg-white/80 p-4">
            <label className="text-sm font-medium text-stone-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                타스크 이름
              </span>
              <input
                type="text"
                value={taskName}
                onChange={(event) => setTaskName(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
              />
            </label>
          </div>

          {renameStatus === "error" ? (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
              {renameError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 rounded-[24px] border border-stone-200 bg-white/80 p-4 sm:grid-cols-2">
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

          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {draftMode ? "현재 타스크 저장" : "새 타스크로 저장"}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {draftMode
                    ? "현재 입력한 신규 타스크를 저장합니다."
                    : "수정한 내용은 기존 타스크를 덮어쓰지 않고 새 타스크로 저장됩니다."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void saveAsNewTask()}
                disabled={saveStatus === "saving"}
                className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveButtonLabel}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-stone-200 bg-white/80 p-4">
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
              새 타스크로 저장할 때 선택한 공개 범위가 그대로 적용됩니다.
            </p>
          </div>

          {saveStatus === "done" && savedTaskId ? (
            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              새 타스크로 저장했습니다.{" "}
              <Link
                href={withEmbedParam(`/tasks/${savedTaskId}`, embed)}
                className="font-semibold underline"
              >
                저장된 타스크 보기
              </Link>
            </div>
          ) : null}

          {saveStatus === "error" ? (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
              {saveError}
            </div>
          ) : null}

          <div className="mt-4 rounded-[24px] border border-stone-200 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              거리
            </p>
            <p className="mt-2 text-lg font-semibold text-stone-900">
              {editableDistanceKm.toFixed(1)}km
            </p>
            <p className="mt-1 text-sm text-stone-600">
              써클 경계 기준 태스크 거리 {taskDistanceKm.toFixed(1)}km
            </p>
          </div>

          <div className="mt-4">
            <TaskElevationProfile
              samples={terrainProfileSamples}
              segments={terrainSegmentProfiles}
              waypoints={terrainProfileWaypoints}
              baseAltitudeM={baseAltitudeM}
              topLevelFullscreenHref={topLevelProfileFullscreenHref}
              autoOpenFullscreen={autoOpenProfileFullscreen}
            />
          </div>

          <ul className="mt-4 space-y-3">
            {editableTurnpoints.map((turnpoint, index) => (
              <li
                key={`${turnpoint.order}-${turnpoint.name}-${index}`}
                className="rounded-2xl border border-stone-200 bg-white/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-900">
                    {turnpoint.order}.{" "}
                    {turnpoint.label ? `${turnpoint.name} / ${turnpoint.label}` : turnpoint.name}
                  </p>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                    {turnpoint.taskType.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  반경 {turnpoint.radiusM}m / 고도{" "}
                  {terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM != null
                    ? `${Math.round(
                        terrainElevations.find((item) => item.order === turnpoint.order)?.elevationM ?? 0
                      )}m`
                    : "미확인"}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {turnpoint.lat.toFixed(5)}, {turnpoint.lng.toFixed(5)}
                </p>
                {isCustomTurnpoint(turnpoint) && task.siteId !== "manual" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void saveTurnpointAsWaypoint(turnpoint)}
                      disabled={waypointSaveStatus[turnpoint.order] === "saving" || waypointSaveStatus[turnpoint.order] === "done"}
                      className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {waypointSaveStatus[turnpoint.order] === "saving"
                        ? "웨이포인트 저장 중..."
                        : waypointSaveStatus[turnpoint.order] === "done"
                          ? "웨이포인트 등록 완료"
                          : "웨이포인트로 등록"}
                    </button>
                    {waypointSaveStatus[turnpoint.order] === "error" &&
                    waypointSaveError[turnpoint.order] ? (
                      <span className="text-sm font-medium text-red-900">
                        {waypointSaveError[turnpoint.order]}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {isCustomTurnpoint(turnpoint) && task.siteId === "manual" ? (
                  <p className="mt-3 text-sm font-medium text-stone-500">
                    직접 입력 사이트는 개별 웨이포인트 등록 대신 상단의 웨이포인트 셋 내보내기를 사용해 주세요.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {canDeleteTask ? (
            <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">타스크 삭제</p>
              <p className="mt-1 text-xs leading-5 text-red-800">
                이 작업은 되돌릴 수 없습니다. 관리자만 저장된 타스크를 삭제할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void deleteCurrentTask()}
                  disabled={deleteStatus === "deleting"}
                  className="btn btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteStatus === "deleting" ? "삭제 중..." : "이 타스크 삭제"}
                </button>
                {deleteStatus === "error" && deleteError ? (
                  <span className="text-sm font-medium text-red-900">{deleteError}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
