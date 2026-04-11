import { NextResponse } from "next/server";
import { setLaunchSiteVisibility } from "@/lib/sites/launch-site-catalog";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      siteId?: string;
      visible?: boolean;
    };

    if (!body.siteId || typeof body.visible !== "boolean") {
      return NextResponse.json(
        { error: "siteId와 visible 값이 필요합니다." },
        { status: 400 }
      );
    }

    await setLaunchSiteVisibility(body.siteId, body.visible);

    return NextResponse.json({
      ok: true,
      siteId: body.siteId,
      visible: body.visible,
      message: body.visible ? "활공장을 목록에 표시합니다." : "활공장을 목록에서 숨깁니다.",
    });
  } catch {
    return NextResponse.json(
      { error: "활공장 노출 설정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
