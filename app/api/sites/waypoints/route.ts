import { NextResponse } from "next/server";
import { getSiteWaypointDatabase } from "@/lib/sites/site-waypoints";

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
