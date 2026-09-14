import { NextRequest, NextResponse } from "next/server";
import { claimProvisioningToken } from "@/lib/provisioning";
import { rotateDeviceToken } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { provisioningId, claimCode } = await request.json();
    if (!provisioningId || !claimCode) return NextResponse.json({ error: "provisioningId and claimCode are required" }, { status: 400 });

    const record = claimProvisioningToken(String(provisioningId), String(claimCode));
    if (!record) return NextResponse.json({ error: "Invalid, expired, or already-used provisioning claim" }, { status: 401 });

    const rotated = rotateDeviceToken(Number(record.deviceId));
    if (!rotated) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      deviceId: rotated.device.id,
      credential: rotated.token,
      tokenPreview: rotated.device.tokenPreview,
      expiresInSeconds: 0,
      note: "This is the device bearer token. Store it securely on the device; it is returned only once."
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
