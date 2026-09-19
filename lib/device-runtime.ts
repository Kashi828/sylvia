import { findDevice, findDeviceByToken, validBearer, type ServerDevice } from "@/lib/store";
import { findPersistentDeviceById, findPersistentDeviceByToken } from "@/lib/persistent-devices";

function extractToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export async function authenticateDevice(request: Request, deviceId?: string | number): Promise<ServerDevice | null> {
  const token = extractToken(request);
  if (!token) return null;

  if (deviceId !== undefined) {
    const id = Number(deviceId);
    const persistent = await findPersistentDeviceByToken(token, String(deviceId));
    if (persistent) return persistent;
    if (Number.isFinite(id) && validBearer(token, id)) return findDevice(id) ?? null;
    return null;
  }

  const persistent = await findPersistentDeviceByToken(token);
  if (persistent) return persistent;
  return findDeviceByToken(token);
}

export async function sessionOrDevice(request: Request, deviceId: string | number): Promise<ServerDevice | null> {
  const token = extractToken(request);
  const id = Number(deviceId);
  if (token) {
    const device = await authenticateDevice(request, deviceId);
    if (device) return device;
  }
  if (Number.isFinite(id)) return findDevice(id) ?? await findPersistentDeviceById(String(deviceId));
  return null;
}
