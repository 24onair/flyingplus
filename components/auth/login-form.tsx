"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm({
  supabaseEnabled,
  nextPath,
}: {
  supabaseEnabled: boolean;
  nextPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const supabase = useMemo(() => {
    if (!supabaseEnabled) {
      return null;
    }

    try {
      return createBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, [supabaseEnabled]);

  const canSubmit = Boolean(supabase);

  function mapLoginMessage(rawMessage: string) {
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("email not confirmed")) {
      return "이 계정은 아직 이메일 확인 상태로 남아 있습니다. 새로 회원가입하면 바로 로그인할 수 있고, 기존 계정은 관리자 승인 과정에서 함께 확인 처리할 수 있습니다.";
    }

    if (normalized.includes("invalid login credentials")) {
      return "이메일 또는 비밀번호를 다시 확인해 주세요.";
    }

    return rawMessage;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase 환경 변수가 없어서 로그인을 진행할 수 없습니다.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(mapLoginMessage(error.message));
      return;
    }

    setStatus("done");
    setMessage("로그인되었습니다. 작업 중이던 화면으로 이동합니다.");
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="text-sm font-medium text-stone-700">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          이메일
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
        />
      </label>

      <label className="text-sm font-medium text-stone-700">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          비밀번호
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
        />
      </label>

      <button
        type="submit"
        disabled={status === "submitting" || !canSubmit}
        className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "로그인 중..." : "로그인"}
      </button>

      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            status === "done"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      ) : null}
    </form>
  );
}
