import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    if (!body.trim()) {
      return NextResponse.json(
        { error: "XCTrack task payload is required." },
        { status: 400 }
      );
    }

    const upstream = await fetch("https://tools.xcontest.org/api/xctsk/qr", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
    });

    if (!upstream.ok) {
      const message = await upstream.text();
      return NextResponse.json(
        {
          error: "Failed to generate XCTrack QR.",
          details: message,
          status: upstream.status,
        },
        { status: 502 }
      );
    }

    const svg = await upstream.text();

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected XCTrack QR generation error.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
