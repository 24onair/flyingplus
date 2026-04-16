"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginPath, withEmbedParam } from "@/lib/embed";
import type { SavedTaskRecord } from "@/types/saved-task";

export function SavedTasksList({
  initialTasks,
  emptyMessage,
  embed = false,
}: {
  initialTasks: SavedTaskRecord[];
  emptyMessage?: string;
  embed?: boolean;
}) {
  const router = useRouter();
  const { getAccessToken, profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const [tasks, setTasks] = useState(initialTasks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function saveName(taskId: string) {
    if (!draftName.trim()) {
      return;
    }

    setSavingId(taskId);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(buildLoginPath(withEmbedParam("/tasks", embed), embed));
        return;
      }

      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          taskId,
          name: draftName,
        }),
      });

      if (!response.ok) {
        throw new Error("이름 수정 실패");
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, name: draftName.trim() } : task
        )
      );
      setEditingId(null);
      setDraftName("");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteTask(taskId: string) {
    const confirmed = window.confirm("이 타스크를 리스트에서 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setDeletingId(taskId);
    setDeleteError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push(buildLoginPath(withEmbedParam("/tasks", embed), embed));
        return;
      }

      const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`, {
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

      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setDeletingId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">
        {emptyMessage ?? "아직 저장된 타스크가 없습니다. 코스 페이지에서 먼저 저장해 주세요."}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {deleteError ? (
        <div className="glass rounded-[28px] border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {deleteError}
        </div>
      ) : null}
      {tasks.map((task) => (
        <div
          key={task.id}
          className="glass rounded-[28px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-500">{task.siteName}</p>
              {isAdmin && !embed ? (
                <p className="mt-1 text-xs font-medium text-stone-500">
                  저장자 {task.ownerName || task.ownerEmail || "알 수 없음"}
                </p>
              ) : null}
              {editingId === task.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="min-w-[240px] flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => void saveName(task.id)}
                    disabled={savingId === task.id}
                    className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === task.id ? "저장 중..." : "이름 저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraftName("");
                    }}
                    className="btn btn-secondary"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <h2 className="mt-1 text-2xl font-bold text-stone-900">{task.name}</h2>
              )}
              <p className="mt-2 text-sm text-stone-600">
                {task.date} / {task.taskType} / {task.turnpoints.length}개 웨이포인트
              </p>
              <p className="mt-1 text-xs font-medium text-stone-500">
                {task.visibility === "public" ? "공개 타스크" : "나만 보는 타스크"}
              </p>
            </div>
            <div className="text-right text-sm text-stone-600">
              <p>{task.distanceKm.toFixed(1)}km</p>
              <p className="mt-1">SSS {task.sssOpenTime}</p>
              <p>Deadline {task.taskDeadlineTime}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={withEmbedParam(`/tasks/${task.id}`, embed)} className="btn btn-secondary">
              상세 보기
            </Link>
            {!embed ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(task.id);
                  setDraftName(task.name);
                }}
                className="btn btn-secondary"
              >
                이름 변경
              </button>
            ) : null}
            {isAdmin && !embed ? (
              <button
                type="button"
                onClick={() => void deleteTask(task.id)}
                disabled={deletingId === task.id}
                className="btn btn-danger disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === task.id ? "삭제 중..." : "삭제"}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
