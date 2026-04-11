"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { ApprovalStatus } from "@/types/profile";

function memberStatusLabel(status: ApprovalStatus, isAdmin: boolean | undefined) {
  if (isAdmin) {
    return "관리자";
  }

  switch (status) {
    case "approved":
      return "일반 회원";
    case "rejected":
      return "반려";
    default:
      return "신청 완료";
  }
}

export function AuthStatus() {
  const { user, profile, isLoading, isSigningOut, supabaseEnabled, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loadingFallbackReady, setLoadingFallbackReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isLoading) {
      setLoadingFallbackReady(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoadingFallbackReady(true);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading, mounted]);

  if (!mounted) {
    return (
      <div className="w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-center text-xs font-medium text-stone-500 md:w-auto">
        계정 확인 중...
      </div>
    );
  }

  if (!supabaseEnabled) {
    return (
      <div className="w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-center text-xs font-medium text-stone-500 md:w-auto">
        Auth 준비 중
      </div>
    );
  }

  if (isLoading) {
    if (loadingFallbackReady) {
      if (!user) {
        return (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <Link href="/auth/login" className="btn btn-secondary">
              로그인
            </Link>
            <Link href="/auth/signup" className="btn btn-primary">
              회원가입
            </Link>
          </div>
        );
      }

      return (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            계정 상태 지연 중
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      );
    }

    return (
      <div className="w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-center text-xs font-medium text-stone-500 md:w-auto">
        계정 확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
        <Link href="/auth/login" className="btn btn-secondary">
          로그인
        </Link>
        <Link href="/auth/signup" className="btn btn-primary">
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
      {profile?.isAdmin ? (
        <Link href="/admin/members" className="btn btn-secondary">
          회원관리
        </Link>
      ) : null}
      <div className="max-w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700">
        <span className="font-semibold text-stone-900">
          {profile?.name || user.email || "회원"}
        </span>
        <span className="mx-2 text-stone-300">|</span>
        <span>{memberStatusLabel(profile?.approvalStatus ?? "pending", profile?.isAdmin)}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
