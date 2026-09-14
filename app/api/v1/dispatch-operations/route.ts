import { NextResponse } from "next/server";
import { listDispatchOperations } from "@/lib/bulk-dispatch";

export async function GET() {
  return NextResponse.json({ operations: listDispatchOperations() });
}
