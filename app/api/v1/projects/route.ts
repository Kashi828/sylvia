import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    projects: [{ id: "sylvia-local-workspace", name: "SYLVIA Cloud Project", status: "active", members: 2 }]
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    { project: { id: `proj_${Date.now()}`, name: body.name || "Untitled Project", status: "active" } },
    { status: 201 }
  );
}
