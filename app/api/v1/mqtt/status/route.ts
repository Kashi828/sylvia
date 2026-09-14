import { NextResponse } from "next/server";
import { mqttStatus } from "@/lib/mqtt-transport";

export async function GET() {
  return NextResponse.json(mqttStatus());
}
