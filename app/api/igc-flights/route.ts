import { NextResponse } from "next/server";
import { listPrototypeFlights, savePrototypeFlight } from "@/lib/igc/prototype-flight-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const flights = await listPrototypeFlights();
    return NextResponse.json({ flights });
  } catch (error) {
    return NextResponse.json(
      {
        error: "IGC 비행 리스트를 불러오지 못했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "업로드할 IGC 파일이 없습니다." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".igc")) {
      return NextResponse.json(
        { error: "IGC 파일만 업로드할 수 있습니다." },
        { status: 400 },
      );
    }

    const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
    const flight = await savePrototypeFlight({
      sourceFileName: file.name,
      igcText: text,
    });

    return NextResponse.json({ flight }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "IGC 업로드 처리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
