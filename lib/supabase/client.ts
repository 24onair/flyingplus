"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const browserSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const browserSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export function hasBrowserSupabasePublicEnv() {
  return Boolean(browserSupabaseUrl && browserSupabasePublishableKey);
}

export function createBrowserSupabaseClient() {
  if (!hasBrowserSupabasePublicEnv()) {
    throw new Error("Supabase 공개 환경 변수가 설정되지 않았습니다.");
  }

  const globalScope = globalThis as typeof globalThis & {
    __xcPlannerSupabaseClient__?: SupabaseClient;
  };

  if (!globalScope.__xcPlannerSupabaseClient__) {
    globalScope.__xcPlannerSupabaseClient__ = createClient(
      browserSupabaseUrl,
      browserSupabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  return globalScope.__xcPlannerSupabaseClient__;
}
