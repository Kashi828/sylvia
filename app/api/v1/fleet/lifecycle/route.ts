import { NextRequest, NextResponse } from "next/server";
import { setLifecycle } from "@/lib/device-registry";

const allowed = new Set(["provisioning", "online", "offline", "disabled"]);

export async function POST(request: NextRequest) {
  try {
    const { deviceId, lifecycle } = await request.json();
    if (!deviceId || !allowed.has(lifecycle)) {
      return NextResponse.json({ error: "deviceId and a valid lifecycle are required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, device: await setLifecycle(String(deviceId), lifecycle) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
