"use client";

import { useState } from "react";

type SiteOption = {
  siteId: string;
  siteName: string;
};

type SignupFormProps = {
  siteOptions: SiteOption[];
  supabaseEnabled: boolean;
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function isValidPhoneNumber(value: string) {
  return /^\d{3}-\d{4}-\d{4}$/.test(value);
}

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

    const resolvedPrimarySiteId =
      primarySiteId === "__custom__" ? customPrimarySite.trim() : primarySiteId;

    if (primarySiteId === "__custom__" && !resolvedPrimarySiteId) {
      setStatus("error");
      setMessage("직접 입력할 선호 활공장을 입력해 주세요.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        nickname,
        email,
        phone,
        primarySiteId: resolvedPrimarySiteId,
        password,
      }),
    });

    const payload = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error ?? "회원가입 요청 처리에 실패했습니다.");
      return;
    }

    setStatus("done");
    setMessage(
      payload.message ??
        "회원가입 요청이 접수되었습니다. 관리자 승인 후 개인 저장 기능을 사용할 수 있습니다."
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            이름
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            닉네임
          </span>
          <input
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            required
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
          />
        </label>
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
            전화번호
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
            required
            inputMode="numeric"
            maxLength={13}
            placeholder="000-0000-0000"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
          />
          <span className="mt-1 block text-xs text-stone-500">
            숫자만 입력하면 자동으로 `000-0000-0000` 형식으로 맞춰집니다.
          </span>
        </label>
        <label className="text-sm font-medium text-stone-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            선호 활공장
          </span>
          <select
            value={primarySiteId}
            onChange={(event) => setPrimarySiteId(event.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
          >
            <option value="">선택 안 함</option>
            <option value="__custom__">직접 입력</option>
            {siteOptions.map((site) => (
              <option key={site.siteId} value={site.siteId}>
                {site.siteName}
              </option>
            ))}
          </select>
          {primarySiteId === "__custom__" ? (
            <input
              type="text"
              value={customPrimarySite}
              onChange={(event) => setCustomPrimarySite(event.target.value)}
              required
              placeholder="예: 문경, 단양, 직접 입력"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
            />
          ) : null}
        </label>
      </div>

      <label className="text-sm font-medium text-stone-700">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          비밀번호
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
        />
      </label>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        회원가입 후에는 바로 저장 권한이 열리지 않고, 관리자 승인 후 개인 타스크 저장과 좋아하는 활공장 저장이 가능합니다.
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || !supabaseEnabled}
        className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "가입 요청 중..." : "회원가입 요청"}
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
