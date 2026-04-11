"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManageSiteToolbar({
  siteId,
  siteName,
  updatedAtLabel,
  hasOverride,
}: {
  siteId: string;
  siteName: string;
  updatedAtLabel: string;
  hasOverride: boolean;
}) {
  const router = useRouter();
  const [resetState, setResetState] = useState<"idle" | "resetting">("idle");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"default" | "error">("default");

  async function handleReset() {
    const confirmed = window.confirm(
      `${siteName}의 저장된 설정을 기본값으로 되돌릴까요?`
    );

    if (!confirmed) {
      return;
    }

    setResetState("resetting");
    setMessage("");

    try {
      const response = await fetch("/api/sites/manage", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          siteName,
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "기본값 되돌리기에 실패했습니다.");
      }

      setMessageTone("default");
      setMessage(payload.message ?? "기본값으로 되돌렸습니다.");
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "기본값 되돌리기 중 알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setResetState("idle");
    }
  }

  return (
    <section className="glass rounded-[28px] border p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-500">관리 상태</p>
          <p className="text-lg font-bold text-stone-900">{siteName}</p>
          <p className="text-sm text-stone-600">
            마지막 수정 시각: {updatedAtLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleReset();
          }}
          disabled={!hasOverride || resetState === "resetting"}
          className="btn btn-danger disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
        >
          {resetState === "resetting" ? "되돌리는 중..." : "기본값으로 되돌리기"}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        저장한 사용자 설정이 있으면 브리핑, 비교, 관리 화면에서 바로 반영됩니다.
        되돌리기를 누르면 기본 활공장 설정으로 즉시 복귀합니다.
      </p>
      {message ? (
        <p
          className={`mt-3 text-sm font-medium ${
            messageTone === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
