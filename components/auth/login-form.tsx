"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 4,
  border: "1px solid #5E5E5E",
  background: "#FFFFFF",
  color: "#000000",
  fontSize: 15,
  fontWeight: 400,
  outline: "none",
  transition: "border-color 200ms ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#757575",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

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
  const [focused, setFocused] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseEnabled) return null;
    try { return createBrowserSupabaseClient(); } catch { return null; }
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

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={labelStyle} htmlFor="login-email">이메일</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          required
          style={{ ...inputStyle, borderColor: focused === "email" ? "#0EA5E9" : "#5E5E5E" }}
          placeholder="이메일 주소 입력"
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="login-password">비밀번호</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          required
          style={{ ...inputStyle, borderColor: focused === "password" ? "#0EA5E9" : "#5E5E5E" }}
          placeholder="비밀번호 입력"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || !canSubmit}
        style={{
          height: 48,
          borderRadius: 4,
          border: `2px solid ${status === "submitting" || !canSubmit ? "#5E5E5E" : "#0EA5E9"}`,
          background: status === "submitting" || !canSubmit ? "transparent" : "transparent",
          color: status === "submitting" || !canSubmit ? "#898989" : "#000000",
          fontSize: 16,
          fontWeight: 700,
          cursor: status === "submitting" || !canSubmit ? "not-allowed" : "pointer",
          transition: "all 200ms ease",
          letterSpacing: "normal",
          textTransform: "uppercase",
        }}
      >
        {status === "submitting" ? "로그인 중..." : "로그인"}
      </button>

      {message ? (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 500,
            background: status === "done" ? "rgba(63,133,0,0.08)" : "rgba(229,32,32,0.08)",
            color: status === "done" ? "#3F8500" : "#E52020",
            border: `1px solid ${status === "done" ? "rgba(63,133,0,0.35)" : "rgba(229,32,32,0.35)"}`,
          }}
        >
          {message}
        </div>
      ) : null}
    </form>
  );
}
