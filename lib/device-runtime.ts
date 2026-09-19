import { findDevice, validBearer, type ServerDevice } from "@/lib/store";
import { findPersistentDeviceById, findPersistentDeviceByToken, markPersistentDeviceOnline } from "@/lib/persistent-devices";

function extractToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export async function resolveDevice(request: Request, deviceId?: string | number): Promise<ServerDevice | null> {
  const token = extractToken(request);

  if (deviceId !== undefined) {
    const id = Number(deviceId);
    if (Number.isFinite(id)) {
      const memoryDevice = findDevice(id);
      if (memoryDevice && (!token || validBearer(token, id))) return memoryDevice;
    }
    const persistent = await findPersistentDeviceById(String(deviceId));
    if (persistent && (!token || await findPersistentDeviceByToken(token, String(deviceId)))) return persistent;
    return null;
  }

  if (token) {
    const memoryToken = validBearer(token);
    if (memoryToken) return findDevice(Number(memoryToken === "" ? NaN : undefined as never)) || null;
    return await findPersistentDeviceByToken(token);
  }

  return null;
}

export async function authenticateDevice(request: Request, deviceId?: string | number) {
  const token = extractToken(request);
  if (!token) return null;

  if (deviceId !== undefined) {
    const persistent = await findPersistentDeviceByToken(token, String(deviceId));
    if (persistent) return persistent;

    const id = Number(deviceId);
    if (Number.isFinite(id) && validBearer(token, id)) return findDevice(id) ?? null;
    return null;
  }

  const persistent = await findPersistentDeviceByToken(token);
  if (persistent) return persistent;

  const memory = validBearer(token);
  return memory ? findDeviceByTokenUnsafe(token) : null;
}

function findDeviceByTokenUnsafe(token: string) {
  const { findDeviceByToken } = requireStore();
  return findDeviceByToken(token);
}

function requireStore() {
  return { findDeviceByToken: (token: string) => {
    const storeModule = require("@/lib/store") as typeof import("@/lib/store");
    return storeModule.findDeviceByToken(token);
  }};
}
