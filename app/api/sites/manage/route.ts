import { NextResponse } from "next/server";
import {
  resetSiteRegistrationOverride,
  saveSiteRegistrationOverride,
} from "@/lib/sites/runtime-site-configs";
import type { NewSiteRegistrationDraft } from "@/types/site-registration";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewSiteRegistrationDraft;

    if (!body?.siteId || !body?.siteName || !body?.launch) {
      return NextResponse.json(
        { error: "활공장 저장에 필요한 필수값이 부족합니다." },
        { status: 400 }
      );
    }

    const saved = await saveSiteRegistrationOverride(body);

    return NextResponse.json({
      ok: true,
      siteId: body.siteId,
      message: `${body.siteName} 설정을 저장했습니다.`,
      updatedAt: saved.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "활공장 설정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { siteId?: string; siteName?: string };

    if (!body.siteId) {
      return NextResponse.json(
        { error: "되돌릴 활공장 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const removed = await resetSiteRegistrationOverride(body.siteId);

    if (!removed) {
      return NextResponse.json({
        ok: true,
        siteId: body.siteId,
        message: `${body.siteName ?? body.siteId}은 이미 기본 설정 상태입니다.`,
      });
    }

    return NextResponse.json({
      ok: true,
      siteId: body.siteId,
      message: `${body.siteName ?? body.siteId} 설정을 기본값으로 되돌렸습니다.`,
    });
  } catch {
    return NextResponse.json(
      { error: "활공장 설정 되돌리기 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
