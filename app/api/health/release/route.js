import { NextResponse } from "next/server";
import { readReleaseMarker } from "@/lib/release-marker";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const release = await readReleaseMarker();
  if (!release) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers },
    );
  }

  return NextResponse.json({ status: "ok", release }, { headers });
}

