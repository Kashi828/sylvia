import { query, databaseConfigured } from "@/lib/db";
import { hashDeviceToken, tokenFingerprint, generateDeviceToken } from "@/lib/device-auth";
import type { ServerDevice } from "@/lib/store";

function normalize(row: Record<string, unknown>): ServerDevice {
  return {
    id: Number(row.device_id),
    name: String(row.name),
    type: String(row.type || "ESP32 Device"),
    state: (row.state && typeof row.state === "object") ? row.state as Record<string, unknown> : {},
    tokenHash: String(row.token_hash || ""),
    tokenPreview: String(row.token_preview || ""),
    online: Boolean(row.online),
    temperature: Number(row.temperature ?? 0),
    battery: Number(row.battery ?? 0),
    lastSeen: row.last_seen ? new Date(String(row.last_seen)).toISOString() : new Date(0).toISOString(),
  };
}

export function persistentDevicesAvailable() {
  return databaseConfigured();
}

export async function registerPersistentDevice(name: string, type: string) {
  if (!databaseConfigured()) return null;

  const token = generateDeviceToken();
  const deviceId = String(Date.now() + Math.floor(Math.random() * 1000));
  const now = new Date().toISOString();

  const result = await query(
    `INSERT INTO device_registry
      (device_id, name, lifecycle, last_seen, firmware, transport, created_at, updated_at, token_hash, token_preview)
     VALUES ($1,$2,'provisioning',NULL,NULL,'unknown',$3,$3,$4,$5)
     RETURNING device_id,name,lifecycle,last_seen,firmware,transport,created_at,updated_at,token_hash,token_preview,state`,
    [deviceId, name.trim(), type.trim() || "ESP32 Device", now, hashDeviceToken(token), tokenFingerprint(token)],
  );

  return { device: normalize(result.rows[0] as Record<string, unknown>), token };
}

export async function findPersistentDeviceById(deviceId: string | number) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state
       FROM device_registry
       WHERE device_id = $1
       LIMIT 1`,
      [String(deviceId)],
    );
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function findPersistentDeviceByToken(token: string, deviceId?: string | number) {
  if (!databaseConfigured() || !token) return null;

  const hash = hashDeviceToken(token);
  const params: unknown[] = [hash];
  let where = "token_hash = $1";
  if (deviceId !== undefined) {
    params.push(String(deviceId));
    where += " AND device_id = $2";
  }

  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state
       FROM device_registry
       WHERE ${where}
       LIMIT 1`,
      params,
    );
    if (!result.rows[0]) return null;
    return normalize(result.rows[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function markPersistentDeviceOnline(
  deviceId: string | number,
  metadata?: { firmware?: string; transport?: "rest" | "mqtt" | "unknown"; temperature?: number; battery?: number; state?: Record<string, unknown> },
) {
  if (!databaseConfigured()) return null;
  const id = String(deviceId);
  const result = await query(
    `UPDATE device_registry
       SET lifecycle='online',
           online=true,
           last_seen=now(),
           firmware=COALESCE($2, firmware),
           transport=COALESCE($3, transport),
           state=COALESCE($4::jsonb, state),
           updated_at=now()
       WHERE device_id=$1
       RETURNING device_id,name,online,temperature,battery,last_seen,token_hash,token_preview`,
    [id, metadata?.firmware ?? null, metadata?.transport ?? null, metadata?.state === undefined ? null : JSON.stringify(metadata.state)],
  );
  if (!result.rows[0]) return null;

  if (metadata?.temperature !== undefined) {
    await query(
      `UPDATE device_registry SET temperature=$2, updated_at=now() WHERE device_id=$1`,
      [id, metadata.temperature],
    );
  }
  if (metadata?.battery !== undefined) {
    await query(
      `UPDATE device_registry SET battery=$2, updated_at=now() WHERE device_id=$1`,
      [id, metadata.battery],
    );
  }

  const refreshed = await query(
    `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state
     FROM device_registry WHERE device_id=$1 LIMIT 1`,
    [id],
  );
  return refreshed.rows[0] ? normalize(refreshed.rows[0] as Record<string, unknown>) : null;
}

export async function listPersistentDevices() {
  if (!databaseConfigured()) return [];
  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state
       FROM device_registry
       ORDER BY name ASC`,
    );
    return result.rows.map((row) => normalize(row as Record<string, unknown>));
  } catch {
    return [];
  }
}
