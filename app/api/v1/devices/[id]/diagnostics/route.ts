import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { findPersistentDeviceById, findPersistentDeviceByToken } from "@/lib/persistent-devices";
import { listPersistentCommands } from "@/lib/persistent-commands";
import { listPersistentDatastreams } from "@/lib/persistent-datastreams";

function sessionUser(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(sessionCookie + "="))?.split("=")[1];
  return getSessionUser(token);
}

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const user = sessionUser(request);

  const device = token
    ? await findPersistentDeviceByToken(token, id)
    : user
      ? await findPersistentDeviceById(id, user.id)
      : null;

  if (!device) {
    return NextResponse.json({ ok: false, error: "Device not found or unauthorized" }, { status: 401 });
  }

  const commands = await listPersistentCommands(id, 20);
  const datastreams = await listPersistentDatastreams(id);
  const lastCommand = commands[0] ?? null;
  const ageSeconds = device.lastSeen ? Math.max(0, Math.floor((Date.now() - Date.parse(device.lastSeen)) / 1000)) : null;

  return NextResponse.json({
    ok: true,
    device: {
      id: String(device.id),
      name: device.name,
      type: device.type,
      lifecycle: device.online ? "online" : "offline",
      online: device.online,
      lastSeen: device.lastSeen,
      lastSeenAgeSeconds: ageSeconds,
      firmware: null,
      temperature: device.temperature,
      battery: device.battery,
      state: device.state,
      transport: "rest",
    },
    protocol: {
      version: "1",
      sdkMinimum: "0.53.8",
      heartbeatIntervalMs: 15000,
      commandPollIntervalMs: 2000,
    },
    datastreams: datastreams.map(stream => ({
      id: stream.id,
      name: stream.name,
      type: stream.type,
      unit: stream.unit,
      value: stream.value,
      lastOccurredAt: stream.lastOccurredAt,
    })),
    commands: {
      totalReturned: commands.length,
      last: lastCommand,
      acked: commands.filter(command => command.status === "acked").length,
      failed: commands.filter(command => command.status === "failed").length,
      pending: commands.filter(command => command.status === "queued" || command.status === "sent").length,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
