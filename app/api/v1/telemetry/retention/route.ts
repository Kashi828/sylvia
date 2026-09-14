import { NextRequest, NextResponse } from "next/server";
import { getRetentionPolicy, setRetentionPolicy } from "@/lib/telemetry-retention";

export async function GET(request: NextRequest) {
  const streamId = request.nextUrl.searchParams.get("streamId");
  if (!streamId) return NextResponse.json({ error: "streamId is required" }, { status: 400 });
  return NextResponse.json({ streamId, policy: getRetentionPolicy(streamId) });
}

export async function PUT(request: NextRequest) {
  try {
    const { streamId, enabled, days } = await request.json();
    if (!streamId) return NextResponse.json({ error: "streamId is required" }, { status: 400 });
    return NextResponse.json({
      ok: true,
      streamId,
      policy: setRetentionPolicy(streamId, { enabled, days }),
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
