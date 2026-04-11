import { NextResponse } from "next/server";
import { getRequestAuthProfile } from "@/lib/supabase/request-auth";
import {
  addFavoriteSiteForUser,
  listFavoriteSiteIdsForUser,
  removeFavoriteSiteForUser,
} from "@/lib/sites/supabase-favorite-sites";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const siteIds = await listFavoriteSiteIdsForUser(auth.userId);
    return NextResponse.json({ siteIds });
  } catch (error) {
    return NextResponse.json(
      {
        error: "즐겨찾는 활공장 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as { siteId?: string };

    if (!payload.siteId?.trim()) {
      return NextResponse.json({ error: "활공장 ID가 필요합니다." }, { status: 400 });
    }

    await addFavoriteSiteForUser(auth.userId, payload.siteId.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "즐겨찾는 활공장 저장 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as { siteId?: string };

    if (!payload.siteId?.trim()) {
      return NextResponse.json({ error: "활공장 ID가 필요합니다." }, { status: 400 });
    }

    await removeFavoriteSiteForUser(auth.userId, payload.siteId.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "즐겨찾는 활공장 삭제 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
