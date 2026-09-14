import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    projectId: id,
    members: [
      { id: 1, name: "Project Owner", role: "Owner", status: "Active" },
      { id: 2, name: "Developer", role: "Builder", status: "Active" }
    ]
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    { projectId: id, invitation: { id: `invite_${Date.now()}`, email: body.email || "", role: body.role || "Viewer", status: "Invited" } },
    { status: 201 }
  );
}
