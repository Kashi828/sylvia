import { NextRequest, NextResponse } from "next/server";
import { markStaleDevices, registerFleetDevice } from "@/lib/device-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ devices: await markStaleDevices() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, name, transport } = body ?? {};
    if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    const device = await registerFleetDevice(String(deviceId), name, transport);
    return NextResponse.json({ ok: true, device });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
