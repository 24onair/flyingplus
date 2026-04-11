import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestAuthProfile } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireAdmin: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profiles: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: "회원 목록 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireAdmin: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as {
      userId?: string;
      approvalStatus?: "pending" | "approved" | "rejected";
      isAdmin?: boolean;
    };

    if (!payload.userId?.trim()) {
      return NextResponse.json({ error: "회원 ID가 필요합니다." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (payload.approvalStatus) updates.approval_status = payload.approvalStatus;
    if (typeof payload.isAdmin === "boolean") updates.is_admin = payload.isAdmin;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    if (payload.approvalStatus === "approved") {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        payload.userId.trim(),
        {
          email_confirm: true,
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", payload.userId.trim())
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "회원 상태 수정 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
