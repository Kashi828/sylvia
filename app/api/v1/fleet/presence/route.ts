import { NextRequest, NextResponse } from "next/server";
import { markDeviceSeen } from "@/lib/device-registry";
import { validBearer } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, firmware, transport = "rest" } = body ?? {};
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!deviceId || !token || !validBearer(token, deviceId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, device: await markDeviceSeen(String(deviceId), { firmware, transport }) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
