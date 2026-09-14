import { NextRequest, NextResponse } from "next/server";
import { createGroup, listGroups } from "@/lib/device-groups";

export async function GET() {
  return NextResponse.json({ groups: listGroups() });
}

export async function POST(request: NextRequest) {
  try {
    const { name, description = "" } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, group: createGroup(name, description) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
