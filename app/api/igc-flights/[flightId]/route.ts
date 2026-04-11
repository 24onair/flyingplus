import { NextResponse } from "next/server";
import { getPrototypeFlight } from "@/lib/igc/prototype-flight-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ flightId: string }> },
) {
  try {
    const { flightId } = await context.params;
    const flight = await getPrototypeFlight(flightId);
    return NextResponse.json({ flight });
  } catch (error) {
    return NextResponse.json(
      {
        error: "IGC 비행 상세를 불러오지 못했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 404 },
    );
  }
}
