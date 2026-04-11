import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SignupPayload = {
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  primarySiteId?: string;
  password?: string;
};

function mapSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already been registered")) {
    return "이미 가입된 이메일입니다. 기존 계정으로 로그인하거나 관리자에게 계정 상태를 확인해 주세요.";
  }

  if (normalized.includes("password")) {
    return "비밀번호 조건을 다시 확인해 주세요. 최소 8자 이상이어야 합니다.";
  }

  return message;
}

function isValidPhoneNumber(value: string) {
  return /^\d{3}-\d{4}-\d{4}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SignupPayload;

    const name = payload.name?.trim() ?? "";
    const nickname = payload.nickname?.trim() ?? "";
    const email = payload.email?.trim() ?? "";
    const phone = payload.phone?.trim() ?? "";
    const primarySiteId = payload.primarySiteId?.trim() ?? "";
    const password = payload.password ?? "";

    if (!name || !nickname || !email || !phone || !password) {
      return NextResponse.json(
        { error: "이름, 닉네임, 이메일, 전화번호, 비밀번호를 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { error: "전화번호는 000-0000-0000 형식으로 입력해 주세요." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        nickname,
        phone,
        primary_site_id: primarySiteId || null,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: mapSignupErrorMessage(error.message) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      message:
        "회원가입 요청이 접수되었습니다. 이제 이메일 확인 없이 로그인할 수 있으며, 관리자 승인 후 개인 저장 기능이 열립니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "회원가입 처리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
