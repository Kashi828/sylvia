import { NextRequest, NextResponse } from "next/server";
import { dispatchBulkCommand } from "@/lib/bulk-dispatch";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { command, payload = {} } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = request.headers.get("idempotency-key") || undefined;
    const operation = await dispatchBulkCommand(id, command, payload, token, key);

    return NextResponse.json(
      { ok: true, operation },
      { status: key && operation.id === key ? 200 : 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dispatch failed" },
      { status: 400 },
    );
  }
}
