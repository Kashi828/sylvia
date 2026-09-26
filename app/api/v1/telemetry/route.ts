import { NextRequest, NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { findPersistentDeviceByToken, findPersistentDeviceById } from "@/lib/persistent-devices";
import { validBearer } from "@/lib/store";
import { ingestMqttTelemetry } from "@/lib/mqtt-telemetry";
import { getTelemetryStats } from "@/lib/telemetry-store";
import { loadPersistedTelemetry, persistTelemetry } from "@/lib/telemetry-persistence";
import { evaluateTelemetry } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  try {
    if (process.env.SYLVIA_BRIDGE_TOKEN && request.headers.get("x-sylvia-bridge-token") && request.headers.get("x-sylvia-bridge-token") !== process.env.SYLVIA_BRIDGE_TOKEN) {
      return NextResponse.json({ error: "Invalid bridge token" }, { status: 403 });
    }
    const body = await request.json();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const sample = await ingestMqttTelemetry({ ...body }, token || undefined);
    const persisted = await persistTelemetry(sample);
    const alerts = typeof sample.value === "number" ? evaluateTelemetry(sample.deviceId, sample.streamId, sample.value) : [];
    return NextResponse.json({ ok: true, sample: persisted, alerts }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telemetry ingestion failed";
    const status = message === "Unauthorized" ? 401 : message === "Device not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requestPrincipal(request);
  const deviceId = request.nextUrl.searchParams.get("deviceId") || undefined;
  const streamId = request.nextUrl.searchParams.get("streamId") || undefined;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";

  if (auth) {
    if (deviceId && !(await findPersistentDeviceById(deviceId, auth.ownerId, auth.projectId))) {
      return NextResponse.json({ ok:false, error:"Device not found" }, { status:404 });
    }
    const samples = await loadPersistedTelemetry(deviceId, streamId, auth.projectId);
    return NextResponse.json({ ok:true, samples, stats:getTelemetryStats(deviceId,streamId), storage:process.env.POSTGRES_URL?"postgresql":"memory-fallback", projectId:auth.projectId });
  }

  const numericId = deviceId ? Number(deviceId) : NaN;
  const tokenDevice = bearer ? await findPersistentDeviceByToken(bearer, deviceId) : null;
  const legacyDeviceOk = bearer && Number.isFinite(numericId) ? validBearer(bearer, numericId) : false;
  if (!tokenDevice && !legacyDeviceOk) return NextResponse.json({ok:false,error:"Authentication required"},{status:401});

  const samples = await loadPersistedTelemetry(deviceId, streamId);
  return NextResponse.json({ok:true,samples,stats:getTelemetryStats(deviceId,streamId),storage:process.env.POSTGRES_URL?"postgresql":"memory-fallback"});
}
