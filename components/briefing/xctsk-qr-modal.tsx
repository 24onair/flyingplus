"use client";

import { useEffect, useState } from "react";

type XctskQrModalProps = {
  open: boolean;
  onClose: () => void;
  xctskContent: string;
  taskName: string;
};

export function XctskQrModal({
  open,
  onClose,
  xctskContent,
  taskName,
}: XctskQrModalProps) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQrSvg(null);
      setStatus("idle");
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadQr() {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/xctsk/qr", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: xctskContent,
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(details || "XCTrack QR generation failed");
        }

        const svg = await response.text();

        if (cancelled) {
          return;
        }

        setQrSvg(svg);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "unknown error");
      }
    }

    void loadQr();

    return () => {
      cancelled = true;
    };
  }, [open, xctskContent]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[32px] border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-500">XCTrack QR</p>
            <h3 className="mt-1 text-2xl font-bold text-stone-900">{taskName}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              XCTrack 공식 QR 생성 경로로 만든 코드입니다. `.xctsk`와 같은 내용을 기준으로
              QR을 생성합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary shrink-0"
          >
            닫기
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-stone-200 bg-stone-50 p-5">
          {status === "loading" ? (
            <div className="flex h-[360px] items-center justify-center rounded-[20px] border border-stone-200 bg-white text-sm font-medium text-stone-600">
              XCTrack QR 생성 중...
            </div>
          ) : null}

          {status === "error" ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
              QR 생성에 실패했습니다.
              <div className="mt-2 whitespace-pre-wrap break-words text-xs text-red-700">
                {error}
              </div>
            </div>
          ) : null}

          {status === "ready" && qrSvg ? (
            <div
              className="mx-auto flex min-h-[360px] items-center justify-center rounded-[20px] border border-stone-200 bg-white p-3 shadow-sm [&>svg]:h-[320px] [&>svg]:w-[320px]"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
          파일 내용 길이:{" "}
          <span className="font-semibold text-stone-900">{xctskContent.length}</span>자
        </div>
      </div>
    </div>
  );
}
