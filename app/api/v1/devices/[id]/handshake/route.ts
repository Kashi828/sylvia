import { NextResponse } from "next/server";
import { findPersistentDeviceByToken } from "@/lib/persistent-devices";

const PROTOCOL_VERSION = "1";
const CAPABILITIES = [
  "heartbeat",
  "telemetry",
  "command_poll",
  "command_ack",
  "state_reporting",
  "idempotent_commands",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const device = token ? await findPersistentDeviceByToken(token, id) : null;

  if (!device) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      deviceId: id,
      protocolVersion: PROTOCOL_VERSION,
      sdkMinVersion: "0.53.6",
      transport: "rest-poll",
      capabilities: CAPABILITIES,
      heartbeatRecommendedMs: 15000,
      commandPollRecommendedMs: 2000,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
