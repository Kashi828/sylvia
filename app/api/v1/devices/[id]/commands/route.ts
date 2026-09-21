import { NextResponse } from "next/server";
import { findPersistentDeviceByToken } from "@/lib/persistent-devices";
import { ackPersistentCommand, claimPersistentCommands } from "@/lib/persistent-commands";

async function authenticate(request: Request, id: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!token) return null;
  return findPersistentDeviceByToken(token, id);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const device = await authenticate(request, id);
  if (!device) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 10;
  const commands = await claimPersistentCommands(id, limit);

  return NextResponse.json({
    ok: true,
    deviceId: id,
    commands,
    count: commands.length,
    transport: "rest-poll",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const device = await authenticate(request, id);
  if (!device) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    commandId?: string;
    result?: unknown;
  } | null;

  const commandId = body?.commandId?.trim();
  if (!commandId) {
    return NextResponse.json({ ok: false, error: "commandId is required" }, { status: 400 });
  }

  const command = await ackPersistentCommand(id, commandId, body?.result ?? null);
  if (!command) {
    return NextResponse.json(
      { ok: false, error: "Command not found or does not belong to this device" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, command, acknowledged: true });
}
