import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { persistParsedWaypointFile } from "@/lib/sites/site-waypoints";
import {
  getManageDraftForSite,
  saveSiteRegistrationOverride,
} from "@/lib/sites/runtime-site-configs";

export const dynamic = "force-dynamic";

const allowedExtensions = ["wpt", "cup", "gpx", "kml", "csv"] as const;
type WaypointUploadType = (typeof allowedExtensions)[number];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const siteId = formData.get("siteId");
    const file = formData.get("file");

    if (typeof siteId !== "string" || !siteId.trim()) {
      return NextResponse.json({ error: "siteId가 필요합니다." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드 파일이 필요합니다." }, { status: 400 });
    }

    const extension = (file.name.split(".").pop()?.toLowerCase() ?? "") as string;

    if (!allowedExtensions.includes(extension as WaypointUploadType)) {
      return NextResponse.json(
        { error: "지원하지 않는 웨이포인트 파일 형식입니다." },
        { status: 400 }
      );
    }
    const fileType = extension as WaypointUploadType;

    const safeSiteId = siteId.replace(/[^a-zA-Z0-9-_]/g, "-");
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-가-힣]/g, "_");
    const targetDir = path.join(
      process.cwd(),
      "data",
      "sites",
      "uploads",
      safeSiteId
    );

    await fs.mkdir(targetDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const targetPath = path.join(targetDir, safeFileName);

    await fs.writeFile(targetPath, buffer);

    let parsedCount = 0;

    if (fileType === "wpt") {
      const parsed = await persistParsedWaypointFile(safeSiteId, safeFileName);
      parsedCount = parsed.length;
    }

    const draft = await getManageDraftForSite(safeSiteId);
    if (draft) {
      await saveSiteRegistrationOverride({
        ...draft,
        waypointUpload: {
          fileName: safeFileName,
          fileType,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      fileName: safeFileName,
      fileType,
      parsedCount,
      relativePath: path.join("data", "sites", "uploads", safeSiteId, safeFileName),
      message: `${safeFileName} 업로드를 완료했습니다.`,
    });
  } catch {
    return NextResponse.json(
      { error: "웨이포인트 파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
