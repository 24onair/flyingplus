"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type CopyComplaintButtonProps = {
  text: string;
};

export function CopyComplaintButton({ text }: CopyComplaintButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2400);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-primary w-full sm:w-auto"
      aria-live="polite"
    >
      {status === "copied"
        ? "복사 완료"
        : status === "failed"
          ? "복사 실패"
          : "본문 복사"}
    </button>
  );
}

export function NewComplaintVersionButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="btn btn-secondary w-full sm:w-auto"
      disabled={isPending}
    >
      {isPending ? "새 문안 생성 중" : "다른 버전"}
    </button>
  );
}
