"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { ApprovalStatus } from "@/types/profile";

function memberStatusLabel(status: ApprovalStatus, isAdmin: boolean | undefined) {
  if (isAdmin) return "관리자";
  switch (status) {
    case "approved": return "일반 회원";
    case "rejected": return "반려";
    default: return "신청 완료";
  }
}

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 36,
  padding: "0 16px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 200ms ease",
  border: "1px solid",
  textDecoration: "none",
  whiteSpace: "nowrap",
  textTransform: "uppercase",
};

const pillYellow: React.CSSProperties = {
  ...pillBase,
  background: "transparent",
  color: "#ffffff",
  borderColor: "#0ea5e9",
  boxShadow: "none",
};

const pillOutline: React.CSSProperties = {
  ...pillBase,
  background: "transparent",
  color: "#a7a7a7",
  borderColor: "#5e5e5e",
  boxShadow: "none",
};

const pillGhost: React.CSSProperties = {
  ...pillBase,
  background: "transparent",
  color: "#a7a7a7",
  borderColor: "#5e5e5e",
};

export function AuthStatus() {
  const { user, profile, isLoading, isSigningOut, supabaseEnabled, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loadingFallbackReady, setLoadingFallbackReady] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isLoading) { setLoadingFallbackReady(false); return; }
    const timeout = window.setTimeout(() => setLoadingFallbackReady(true), 2500);
    return () => window.clearTimeout(timeout);
  }, [isLoading, mounted]);

  if (!mounted) {
    return <span style={pillGhost}>확인 중...</span>;
  }

  if (!supabaseEnabled) {
    return <span style={pillGhost}>Auth 준비 중</span>;
  }

  if (isLoading) {
    if (loadingFallbackReady) {
      if (!user) {
        return (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/auth/login" style={pillOutline}>로그인</Link>
            <Link href="/auth/signup" style={pillYellow}>회원가입</Link>
          </div>
        );
      }
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ ...pillGhost, color: "#0ea5e9", borderColor: "rgba(14,165,233,0.4)", background: "rgba(14,165,233,0.08)", fontSize: 12 }}>
            계정 상태 지연 중
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            style={{ ...pillGhost, cursor: isSigningOut ? "not-allowed" : "pointer", opacity: isSigningOut ? 0.5 : 1 }}
          >
            {isSigningOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      );
    }
    return <span style={pillGhost}>계정 확인 중...</span>;
  }

  if (!user) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href="/auth/login" style={pillOutline}>로그인</Link>
        <Link href="/auth/signup" style={pillYellow}>회원가입</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {profile?.isAdmin ? (
        <Link href="/admin/members" style={pillOutline}>회원관리</Link>
      ) : null}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 36,
          padding: "0 14px",
          borderRadius: 4,
          fontSize: 12,
          background: "#0f0f0f",
          border: "1px solid #2b2b2b",
          color: "#ffffff",
          gap: 6,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontWeight: 700 }}>{profile?.name || user.email || "회원"}</span>
        <span style={{ color: "#5e5e5e" }}>|</span>
        <span style={{ color: "#a7a7a7" }}>{memberStatusLabel(profile?.approvalStatus ?? "pending", profile?.isAdmin)}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        style={{
          ...pillGhost,
          cursor: isSigningOut ? "not-allowed" : "pointer",
          opacity: isSigningOut ? 0.5 : 1,
        }}
      >
        {isSigningOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
