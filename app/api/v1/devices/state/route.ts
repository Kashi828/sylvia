import { NextRequest, NextResponse } from "next/server";
import { getDeviceState, setDeviceState, type DeviceStateValue } from "@/lib/persistent-state";
import { publishState } from "@/lib/state-events";
import { validBearer } from "@/lib/store";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !validBearer(token, Number(deviceId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getDeviceState(deviceId));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, values } = body ?? {};
    if (!deviceId || !values || typeof values !== "object" || Array.isArray(values)) {
      return NextResponse.json({ error: "deviceId and an object named values are required" }, { status: 400 });
    }
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || !validBearer(token, Number(deviceId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clean: Record<string, DeviceStateValue> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        clean[key] = value as DeviceStateValue;
      }
    }
    const state = setDeviceState(deviceId, clean);
    publishState({ type: "device.state.updated", deviceId, state: state.values, updatedAt: state.updatedAt });
    return NextResponse.json({ ok: true, state });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
