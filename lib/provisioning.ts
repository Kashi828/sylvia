import crypto from "node:crypto";

export type ProvisioningRecord = {
  id: string;
  deviceId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  claimCode: string;
};

const records = new Map<string, ProvisioningRecord>();

export function createProvisioningToken(deviceId: string, ttlSeconds = 900) {
  const id = crypto.randomUUID();
  const claimCode = crypto.randomBytes(12).toString("hex");
  const now = Date.now();

  const record: ProvisioningRecord = {
    id,
    deviceId,
    claimCode,
    used: false,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
  };

  records.set(id, record);
  return record;
}

export function getProvisioningToken(id: string) {
  return records.get(id) ?? null;
}

export function claimProvisioningToken(id: string, claimCode: string) {
  const record = records.get(id);
  if (!record || record.used) return null;
  if (Date.now() > Date.parse(record.expiresAt)) return null;
  const expected = Buffer.from(record.claimCode);
  const provided = Buffer.from(claimCode);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  record.used = true;
  records.set(id, record);
  return record;
}
