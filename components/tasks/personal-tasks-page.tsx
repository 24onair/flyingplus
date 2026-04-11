"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { SavedTasksList } from "@/components/tasks/saved-tasks-list";
import type { SavedTaskRecord } from "@/types/saved-task";

type TasksApiResponse = {
  tasks?: SavedTaskRecord[];
  error?: string;
  details?: string;
};

async function readTasksResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("서버가 JSON이 아닌 응답을 반환했습니다.");
  }

  return JSON.parse(raw) as TasksApiResponse;
}

export function PersonalTasksPage() {
  const { user, profile, isLoading, getAccessToken } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const canAccessOwnTasks = isAdmin || canUsePersonalStorage(profile);
  const [publicTasks, setPublicTasks] = useState<SavedTaskRecord[]>([]);
  const [myTasks, setMyTasks] = useState<SavedTaskRecord[]>([]);
  const [allTasks, setAllTasks] = useState<SavedTaskRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setStatus("loading");
      setError("");

      try {
        const publicResponse = await fetch("/api/tasks?scope=public");
        const publicPayload = await readTasksResponse(publicResponse);

        if (!publicResponse.ok) {
          throw new Error(publicPayload.error ?? publicPayload.details ?? "공개 타스크 조회 실패");
        }

        let myTasksResult: SavedTaskRecord[] = [];
        let allTasksResult: SavedTaskRecord[] = [];

        if (user && canAccessOwnTasks) {
          const accessToken = await getAccessToken();

          if (!accessToken) {
            throw new Error("로그인 세션을 확인하지 못했습니다.");
          }

          const scope = isAdmin ? "all" : "mine";
          const ownResponse = await fetch(`/api/tasks?scope=${scope}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const ownPayload = await readTasksResponse(ownResponse);

          if (!ownResponse.ok) {
            throw new Error(ownPayload.error ?? ownPayload.details ?? "타스크 목록 조회 실패");
          }

          if (isAdmin) {
            allTasksResult = ownPayload.tasks ?? [];
          } else {
            myTasksResult = ownPayload.tasks ?? [];
          }
        }

        if (!cancelled) {
          setPublicTasks(publicPayload.tasks ?? []);
          setMyTasks(myTasksResult);
          setAllTasks(allTasksResult);
          setStatus("done");
        }
      } catch (nextError) {
        if (!cancelled) {
          setStatus("error");
          setError(nextError instanceof Error ? nextError.message : "알 수 없는 오류");
        }
      }
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [canAccessOwnTasks, getAccessToken, isAdmin, user]);

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-[28px] border p-6">
        <p className="text-sm font-semibold text-stone-500">공개 타스크</p>
        <h2 className="mt-1 text-2xl font-bold text-stone-900">모두가 보는 오픈 타스크</h2>
        <p className="mt-2 text-sm text-stone-600">
          공개로 저장된 타스크만 이 목록에 표시됩니다.
        </p>
      </section>
      <SavedTasksList
        initialTasks={publicTasks}
        emptyMessage="아직 공개된 타스크가 없습니다."
      />

      {!user ? (
        <div className="glass rounded-[28px] border p-6 text-sm text-stone-700">
          내 타스크를 보려면 로그인이 필요합니다.{" "}
          <Link href="/auth/login" className="font-semibold text-stone-900 underline">
            로그인하러 가기
          </Link>
        </div>
      ) : null}

      {user && !isAdmin && !canUsePersonalStorage(profile) ? (
        <div className="glass rounded-[28px] border p-6 text-sm text-stone-700">
          관리자 승인 후 내 타스크 저장 목록을 사용할 수 있습니다.
        </div>
      ) : null}

      {user && canAccessOwnTasks && !isAdmin ? (
        <>
          <section className="glass rounded-[28px] border p-6">
            <p className="text-sm font-semibold text-stone-500">내 타스크</p>
            <h2 className="mt-1 text-2xl font-bold text-stone-900">내가 저장한 타스크</h2>
            <p className="mt-2 text-sm text-stone-600">
              개인 회원은 자신이 저장한 타스크만 여기에서 볼 수 있습니다.
            </p>
          </section>
          <SavedTasksList
            initialTasks={myTasks}
            emptyMessage="아직 내가 저장한 타스크가 없습니다."
          />
        </>
      ) : null}

      {isAdmin ? (
        <>
          <section className="glass rounded-[28px] border p-6">
            <p className="text-sm font-semibold text-stone-500">관리자 전체 타스크</p>
            <h2 className="mt-1 text-2xl font-bold text-stone-900">전체 저장 타스크</h2>
            <p className="mt-2 text-sm text-stone-600">
              관리자는 전체 회원의 저장 타스크를 모두 확인할 수 있습니다.
            </p>
          </section>
          <SavedTasksList
            initialTasks={allTasks}
            emptyMessage="저장된 타스크가 없습니다."
          />
        </>
      ) : null}
    </div>
  );
}
