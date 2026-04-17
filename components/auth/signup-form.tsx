"use client";

import { useState } from "react";

type SiteOption = { siteId: string; siteName: string };
type SignupFormProps = { siteOptions: SiteOption[]; supabaseEnabled: boolean };

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function isValidPhoneNumber(value: string) {
  return /^\d{3}-\d{4}-\d{4}$/.test(value);
}

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

const labelTextStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#757575",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

export function SignupForm({ siteOptions, supabaseEnabled }: SignupFormProps) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [primarySiteId, setPrimarySiteId] = useState(siteOptions[0]?.siteId ?? "");
  const [customPrimarySite, setCustomPrimarySite] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const focusBorder = (field: string) => focused === field ? "#0EA5E9" : "#5E5E5E";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseEnabled) {
      setStatus("error");
      setMessage("Supabase 환경 변수가 없어서 회원가입을 진행할 수 없습니다.");
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setStatus("error");
      setMessage("전화번호는 000-0000-0000 형식으로 입력해 주세요.");
      return;
    }
    const resolvedPrimarySiteId = primarySiteId === "__custom__" ? customPrimarySite.trim() : primarySiteId;
    if (primarySiteId === "__custom__" && !resolvedPrimarySiteId) {
      setStatus("error");
      setMessage("직접 입력할 선호 활공장을 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    setMessage("");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, nickname, email, phone, primarySiteId: resolvedPrimarySiteId, password }),
    });

    const payload = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error ?? "회원가입 요청 처리에 실패했습니다.");
      return;
    }
    setStatus("done");
    setMessage(payload.message ?? "회원가입 요청이 접수되었습니다. 관리자 승인 후 개인 저장 기능을 사용할 수 있습니다.");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelTextStyle} htmlFor="signup-name">이름</label>
          <input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} required
            style={{ ...inputStyle, borderColor: focusBorder("name") }} />
        </div>
        <div>
          <label style={labelTextStyle} htmlFor="signup-nickname">닉네임</label>
          <input id="signup-nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
            onFocus={() => setFocused("nickname")} onBlur={() => setFocused(null)} required
            style={{ ...inputStyle, borderColor: focusBorder("nickname") }} />
        </div>
        <div>
          <label style={labelTextStyle} htmlFor="signup-email">이메일</label>
          <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} required
            style={{ ...inputStyle, borderColor: focusBorder("email") }} />
        </div>
        <div>
          <label style={labelTextStyle} htmlFor="signup-phone">전화번호</label>
          <input id="signup-phone" type="tel" value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
            required inputMode="numeric" maxLength={13} placeholder="000-0000-0000"
            style={{ ...inputStyle, borderColor: focusBorder("phone") }} />
          <p style={{ marginTop: 4, fontSize: 12, color: "#848E9C" }}>숫자만 입력하면 자동 형식화</p>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelTextStyle} htmlFor="signup-site">선호 활공장</label>
          <select id="signup-site" value={primarySiteId} onChange={(e) => setPrimarySiteId(e.target.value)}
            onFocus={() => setFocused("site")} onBlur={() => setFocused(null)}
            style={{ ...inputStyle, cursor: "pointer", borderColor: focusBorder("site") }}
          >
            <option value="">선택 안 함</option>
            <option value="__custom__">직접 입력</option>
            {siteOptions.map((site) => (
              <option key={site.siteId} value={site.siteId}>{site.siteName}</option>
            ))}
          </select>
          {primarySiteId === "__custom__" && (
            <input type="text" value={customPrimarySite}
              onChange={(e) => setCustomPrimarySite(e.target.value)}
              onFocus={() => setFocused("custom")} onBlur={() => setFocused(null)}
              required placeholder="예: 문경, 단양, 직접 입력"
              style={{ ...inputStyle, marginTop: 8, borderColor: focusBorder("custom") }} />
          )}
        </div>
      </div>

      <div>
        <label style={labelTextStyle} htmlFor="signup-password">비밀번호</label>
        <input id="signup-password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
          required minLength={8}
          style={{ ...inputStyle, borderColor: focusBorder("password") }} />
      </div>

      <div style={{
        padding: "12px 16px",
        borderRadius: 4,
        fontSize: 14,
        background: "rgba(14,165,233,0.08)",
        border: "1px solid rgba(14,165,233,0.35)",
        color: "#0046A4",
        fontWeight: 500,
      }}>
        회원가입 후에는 바로 저장 권한이 열리지 않고, 관리자 승인 후 개인 타스크 저장과 좋아하는 활공장 저장이 가능합니다.
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || !supabaseEnabled}
        style={{
          height: 48,
          borderRadius: 4,
          border: `2px solid ${status === "submitting" || !supabaseEnabled ? "#5E5E5E" : "#0EA5E9"}`,
          background: "transparent",
          color: status === "submitting" || !supabaseEnabled ? "#898989" : "#000000",
          fontSize: 16,
          fontWeight: 700,
          cursor: status === "submitting" || !supabaseEnabled ? "not-allowed" : "pointer",
          transition: "all 200ms ease",
          letterSpacing: "normal",
          textTransform: "uppercase",
        }}
      >
        {status === "submitting" ? "가입 요청 중..." : "회원가입 요청"}
      </button>

      {message ? (
        <div style={{
          padding: "12px 16px",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 500,
          background: status === "done" ? "rgba(63,133,0,0.08)" : "rgba(229,32,32,0.08)",
          color: status === "done" ? "#3F8500" : "#E52020",
          border: `1px solid ${status === "done" ? "rgba(63,133,0,0.35)" : "rgba(229,32,32,0.35)"}`,
        }}>
          {message}
        </div>
      ) : null}
    </form>
  );
}
