import { canUsePersonalStorage } from "@/lib/auth/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/profile";

type AuthRequirementOptions = {
  requireApproved?: boolean;
  requireAdmin?: boolean;
};

export type RequestAuthResult =
  | {
      ok: true;
      userId: string;
      profile: UserProfile;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getRequestAuthProfile(
  request: Request,
  options: AuthRequirementOptions = {}
): Promise<RequestAuthResult> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: "로그인 세션을 확인하지 못했습니다.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profileRow) {
    return {
      ok: false,
      status: 403,
      error: "회원 프로필을 찾지 못했습니다.",
    };
  }

  const profile: UserProfile = {
    id: profileRow.id,
    email: profileRow.email,
    name: profileRow.name,
    phone: profileRow.phone,
    primarySiteId: profileRow.primary_site_id,
    approvalStatus: profileRow.approval_status,
    isAdmin: profileRow.is_admin,
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  };

  if (options.requireAdmin && !profile.isAdmin) {
    return { ok: false, status: 403, error: "관리자만 접근할 수 있습니다." };
  }

  if (options.requireApproved && !canUsePersonalStorage(profile)) {
    return {
      ok: false,
      status: 403,
      error: "관리자 승인 후 개인 저장 기능을 사용할 수 있습니다.",
    };
  }

  return { ok: true, userId: user.id, profile };
}
