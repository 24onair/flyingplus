import { NextResponse } from "next/server";
import { getRequestAuthProfile } from "@/lib/supabase/request-auth";
import { appendCustomWaypoint, getSiteWaypointDatabase } from "@/lib/sites/site-waypoints";
import type { WaypointCategory } from "@/types/course";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId")?.trim();

  if (!siteId) {
    return NextResponse.json({ error: "siteId가 필요합니다." }, { status: 400 });
  }

  try {
    const waypoints = await getSiteWaypointDatabase(siteId);

    return NextResponse.json({
      ok: true,
      siteId,
      count: waypoints.length,
      waypoints,
    });
  } catch {
    return NextResponse.json(
      { error: "활공장 웨이포인트를 불러오는 중 오류가 발생했습니다." },
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

    const body = (await request.json()) as {
      siteId?: string;
      name?: string;
      label?: string;
      lat?: number;
      lng?: number;
      elevationM?: number | null;
      category?: WaypointCategory;
    };

    if (
      !body.siteId?.trim() ||
      body.siteId === "manual" ||
      !body.name?.trim() ||
      typeof body.lat !== "number" ||
      typeof body.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "웨이포인트 저장에 필요한 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const record = await appendCustomWaypoint(body.siteId.trim(), {
      name: body.name.trim(),
      label: body.label?.trim(),
      lat: body.lat,
      lng: body.lng,
      elevationM: body.elevationM ?? 0,
      category: body.category ?? "turnpoint",
    });

    return NextResponse.json({ ok: true, waypoint: record });
  } catch (error) {
    return NextResponse.json(
      {
        error: "커스텀 웨이포인트 저장 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
