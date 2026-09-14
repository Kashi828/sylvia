import { NextRequest, NextResponse } from "next/server";
import { publishDeviceCommand } from "@/lib/mqtt-transport";
import { validBearer } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, command, payload = {} } = body ?? {};

    if (!deviceId || !command) {
      return NextResponse.json(
        { error: "deviceId and command are required" },
        { status: 400 },
      );
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || !validBearer(token, deviceId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await publishDeviceCommand(deviceId, {
      command,
      payload,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, transport: "mqtt" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "MQTT publish failed",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
