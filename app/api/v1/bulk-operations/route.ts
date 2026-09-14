import { NextResponse } from "next/server";
import { listBulkOperations } from "@/lib/bulk-operations";

export async function GET() {
  return NextResponse.json({ operations: listBulkOperations() });
}
