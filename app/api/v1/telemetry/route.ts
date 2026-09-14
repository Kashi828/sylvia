import { NextRequest, NextResponse } from "next/server";
import { ingestMqttTelemetry } from "@/lib/mqtt-telemetry";
import { getTelemetryStats } from "@/lib/telemetry-store";
import { loadPersistedTelemetry, persistTelemetry } from "@/lib/telemetry-persistence";
import { evaluateTelemetry } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  try {
    if (process.env.SYLVIA_BRIDGE_TOKEN && request.headers.get('x-sylvia-bridge-token') && request.headers.get('x-sylvia-bridge-token') !== process.env.SYLVIA_BRIDGE_TOKEN) {
      return NextResponse.json({ error: 'Invalid bridge token' }, { status: 403 });
    }
    const body = await request.json();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const sample = ingestMqttTelemetry({ ...body }, token || undefined);
    const persisted = await persistTelemetry(sample);
    const alerts = typeof sample.value === 'number' ? evaluateTelemetry(sample.deviceId, sample.streamId, sample.value) : [];
    return NextResponse.json({ ok: true, sample: persisted, alerts }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telemetry ingestion failed";
    const status = message === "Unauthorized" ? 401 : message === "Device not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") || undefined;
  const streamId = request.nextUrl.searchParams.get("streamId") || undefined;
  const samples = await loadPersistedTelemetry(deviceId, streamId);
  return NextResponse.json({
    samples,
    stats: getTelemetryStats(deviceId, streamId),
    storage: process.env.DATABASE_URL ? "postgresql" : "memory-fallback",
  });
}
