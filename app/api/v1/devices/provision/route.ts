import { NextRequest, NextResponse } from "next/server";
import { createProvisioningToken } from "@/lib/provisioning";
import { findDevice, validBearer } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || !validBearer(token, deviceId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!findDevice(deviceId)) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const record = createProvisioningToken(deviceId);
    return NextResponse.json({
      ok: true,
      provisioningId: record.id,
      claimCode: record.claimCode,
      expiresAt: record.expiresAt,
      brokerTopic: `sylvia/provision/${record.id}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
