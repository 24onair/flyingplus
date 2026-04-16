"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { buildLoginPath, withEmbedParam } from "@/lib/embed";
import { SavedTaskDetail } from "@/components/tasks/saved-task-detail";
import type { SavedTaskRecord } from "@/types/saved-task";

type TaskApiResponse = {
  task?: SavedTaskRecord;
  error?: string;
  details?: string;
};

async function readTaskResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("서버가 JSON이 아닌 응답을 반환했습니다.");
  }

  return JSON.parse(raw) as TaskApiResponse;
}

export function PersonalTaskDetailPage({
  taskId,
  embed = false,
  autoOpenMapFullscreen = false,
}: {
  taskId: string;
  embed?: boolean;
  autoOpenMapFullscreen?: boolean;
}) {
  const { user, profile, isLoading, getAccessToken } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const canAccessTasks = isAdmin || canUsePersonalStorage(profile);
  const [task, setTask] = useState<SavedTaskRecord | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      if (isLoading) {
        return;
      }

      setStatus("loading");
      setError("");

      try {
        const headers: HeadersInit = {};

        if (user && canAccessTasks) {
          const accessToken = await getAccessToken();

          if (!accessToken) {
            throw new Error("로그인 세션을 확인하지 못했습니다.");
          }

          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`, {
          headers,
        });
        const payload = await readTaskResponse(response);

        if (!response.ok) {
          throw new Error(payload.error ?? payload.details ?? "타스크 상세 조회 실패");
        }

        if (!cancelled) {
          setTask(payload.task ?? null);
          setStatus("done");
        }
      } catch (nextError) {
        if (!cancelled) {
          setStatus("error");
          setError(
            nextError instanceof Error ? nextError.message : "알 수 없는 오류"
          );
        }
      }
    }

    void loadTask();

    return () => {
      cancelled = true;
    };
  }, [canAccessTasks, getAccessToken, isLoading, taskId, user]);

  if (isLoading) {
    return (
      <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">
        계정 상태를 확인하고 있습니다...
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">
        타스크를 불러오는 중입니다...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
        {!user ? (
          <span>
            {" "}
            공개 타스크가 아니라면{" "}
            <Link
              href={buildLoginPath(withEmbedParam(`/tasks/${taskId}`, embed), embed)}
              className="font-semibold underline"
            >
              로그인
            </Link>
            해 주세요.
          </span>
        ) : null}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">
        타스크를 찾지 못했습니다.
      </div>
    );
  }

  return (
    <div className={embed ? "space-y-3" : "space-y-4"}>
      {!embed && isAdmin ? (
        <div className="glass rounded-[24px] border p-4 text-sm text-stone-600">
          저장자{" "}
          <span className="font-semibold text-stone-900">
            {task.ownerName || task.ownerEmail || "알 수 없음"}
          </span>
          {task.ownerEmail && task.ownerName ? (
            <span className="ml-2 text-stone-500">({task.ownerEmail})</span>
          ) : null}
        </div>
      ) : null}
      <SavedTaskDetail
        task={task}
        embed={embed}
        autoOpenMapFullscreen={autoOpenMapFullscreen}
      />
    </div>
  );
}
