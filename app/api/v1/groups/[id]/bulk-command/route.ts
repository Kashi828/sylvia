import { NextRequest, NextResponse } from "next/server";
import { getGroup } from "@/lib/device-groups";
import { createBulkOperation } from "@/lib/bulk-operations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const group = getGroup(id);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const { command, payload = {} } = await request.json();
    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const operation = createBulkOperation(
      group.id,
      group.deviceIds,
      command,
      payload,
      token,
    );

    return NextResponse.json({ ok: true, operation }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
