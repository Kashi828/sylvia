import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { findPersistentDeviceByToken } from "@/lib/persistent-devices";
import { validBearer } from "@/lib/store";
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
    const sample = await ingestMqttTelemetry({ ...body }, token || undefined);
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

  const sessionToken = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  const hasSession = Boolean(sessionToken && getSessionUser(sessionToken));
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const numericId = deviceId ? Number(deviceId) : NaN;
  const deviceBearerOk = bearer && Number.isFinite(numericId)
    ? Boolean(await findPersistentDeviceByToken(bearer, deviceId) || validBearer(bearer, numericId))
    : false;

  if (!hasSession && !deviceBearerOk) {
    return NextResponse.json({ ok:false, error:"Authentication required" }, { status:401 });
  }

  const samples = await loadPersistedTelemetry(deviceId, streamId);
  return NextResponse.json({
    ok:true,
    samples,
    stats: getTelemetryStats(deviceId, streamId),
    storage: process.env.POSTGRES_URL ? "postgresql" : "memory-fallback",
  });
}
