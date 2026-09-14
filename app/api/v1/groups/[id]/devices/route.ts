import { NextRequest, NextResponse } from "next/server";
import { addDevicesToGroup, getGroup, updateGroupDevices } from "@/lib/device-groups";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const group = getGroup(id);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  return NextResponse.json({ group });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { deviceIds } = await request.json();
    if (!Array.isArray(deviceIds)) {
      return NextResponse.json({ error: "deviceIds must be an array" }, { status: 400 });
    }
    const group = addDevicesToGroup(id, deviceIds);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json({ ok: true, group });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { deviceIds } = await request.json();
    if (!Array.isArray(deviceIds)) {
      return NextResponse.json({ error: "deviceIds must be an array" }, { status: 400 });
    }
    const group = updateGroupDevices(id, deviceIds);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json({ ok: true, group });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
