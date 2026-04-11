import { NextResponse } from "next/server";
import { getRequestAuthProfile } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    return NextResponse.json({ profile: auth.profile, userId: auth.userId });
  } catch (error) {
    return NextResponse.json(
      {
        error: "현재 계정 정보를 불러오는 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
