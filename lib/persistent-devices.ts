import { query, databaseConfigured } from "@/lib/db";
import { hashDeviceToken, tokenFingerprint, generateDeviceToken } from "@/lib/device-auth";
import type { ServerDevice } from "@/lib/store";
import { DEFAULT_PROJECT_ID } from "@/lib/workspace-projects";

function normalize(row: Record<string, unknown>): ServerDevice {
  return {
    id: Number(row.device_id),
    name: String(row.name),
    type: String(row.type || "ESP32 Device"),
    state: (row.state && typeof row.state === "object") ? row.state as Record<string, unknown> : {},
    tokenHash: String(row.token_hash || ""),
    tokenPreview: String(row.token_preview || ""),
    tokenGeneration: Number(row.token_generation ?? 1),
    tokenRevoked: Boolean(row.token_revoked),
    tokenRotatedAt: row.token_rotated_at ? new Date(String(row.token_rotated_at)).toISOString() : null,
    tokenLastAuthenticatedAt: row.token_last_authenticated_at ? new Date(String(row.token_last_authenticated_at)).toISOString() : null,
    online: Boolean(row.online),
    temperature: Number(row.temperature ?? 0),
    battery: Number(row.battery ?? 0),
    lastSeen: row.last_seen ? new Date(String(row.last_seen)).toISOString() : new Date(0).toISOString(),
  };
}

export function persistentDevicesAvailable() {
  return databaseConfigured();
}

export async function registerPersistentDevice(name: string, type: string, ownerId?: string, projectId=DEFAULT_PROJECT_ID) {
  if (!databaseConfigured()) return null;

  const token = generateDeviceToken();
  const deviceId = String(Date.now() + Math.floor(Math.random() * 1000));
  const now = new Date().toISOString();

  const result = await query(
    `INSERT INTO device_registry
      (device_id, name, lifecycle, last_seen, firmware, transport, created_at, updated_at, token_hash, token_preview,owner_id,project_id,token_generation,token_revoked)
     VALUES ($1,$2,'provisioning',NULL,NULL,'unknown',$3,$3,$4,$5,$6,$7,$8)
     RETURNING device_id,name,type,lifecycle,last_seen,firmware,transport,created_at,updated_at,token_hash,token_preview,state,owner_id,token_generation,token_revoked,token_rotated_at,token_last_authenticated_at`,
    [deviceId, name.trim(), type.trim() || "ESP32 Device", now, hashDeviceToken(token), tokenFingerprint(token), ownerId ?? null, projectId, 1, false],
  );

  return { device: normalize(result.rows[0] as Record<string, unknown>), token };
}

export async function rotatePersistentDeviceToken(deviceId:string|number,ownerId:string,projectId=DEFAULT_PROJECT_ID){
  if(!databaseConfigured())return null;
  const token=generateDeviceToken();
  const r=await query(
    `UPDATE public.device_registry
       SET token_hash=$3, token_preview=$4, token_generation=token_generation+1,
           token_revoked=false, token_rotated_at=NOW(), token_last_authenticated_at=NULL, updated_at=NOW()
       WHERE device_id=$1 AND owner_id=$2 AND project_id=$5
       RETURNING device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state,token_generation,token_revoked,token_rotated_at,token_last_authenticated_at`,
    [String(deviceId),ownerId,hashDeviceToken(token),tokenFingerprint(token),projectId],
  );
  return r.rows[0]?{device:normalize(r.rows[0] as Record<string,unknown>),token}:null;
}

export async function revokePersistentDeviceToken(deviceId:string|number,ownerId:string,projectId=DEFAULT_PROJECT_ID){
  if(!databaseConfigured())return false;
  const r=await query(`UPDATE public.device_registry SET token_revoked=true,updated_at=NOW() WHERE device_id=$1 AND owner_id=$2 AND project_id=$3 AND token_revoked=false`,[String(deviceId),ownerId,projectId]);
  return r.rowCount===1;
}
export async function findPersistentDeviceById(deviceId: string | number, ownerId?: string, projectId?: string) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state,token_generation,token_revoked,token_rotated_at,token_last_authenticated_at
       FROM device_registry
       WHERE device_id = $1
         AND ($2::text IS NULL OR owner_id = $2::text)
         AND ($3::text IS NULL OR project_id = $3::text)
       LIMIT 1`,
      [String(deviceId), ownerId ?? null, projectId ?? null],
    );
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function findPersistentDeviceByToken(token: string, deviceId?: string | number, projectId?: string) {
  if (!databaseConfigured() || !token) return null;

  const hash = hashDeviceToken(token);
  const params: unknown[] = [hash];
  let where = "token_hash = $1";
  if (deviceId !== undefined) {
    params.push(String(deviceId));
    where += " AND device_id = $2";
  }
  if (projectId !== undefined) {
    params.push(String(projectId));
    where += ` AND project_id = ${params.length}`;
  }

  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state,token_generation,token_revoked,token_rotated_at,token_last_authenticated_at
       FROM device_registry
       WHERE token_revoked = false AND ${where}
       LIMIT 1`,
      params,
    );
    if (!result.rows[0]) return null;
    void query("UPDATE device_registry SET token_last_authenticated_at=NOW(), updated_at=NOW() WHERE device_id=$1",[String(result.rows[0].device_id)]).catch(()=>undefined);
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

export async function listPersistentDevices(ownerId?: string, projectId?: string) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query(
      `SELECT device_id,name,type,online,temperature,battery,last_seen,token_hash,token_preview,state
       FROM device_registry
       WHERE ($1::text IS NULL OR owner_id = $1::text)
         AND ($2::text IS NULL OR project_id = $2::text)
       ORDER BY name ASC`,
      [ownerId ?? null, projectId ?? null],
    );
    return result.rows.map((row) => normalize(row as Record<string, unknown>));
  } catch {
    return [];
  }
}


export async function listPersistentFleetDevices(ownerId?: string, projectId?: string) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query(
      `SELECT device_id,name,type,lifecycle,online,temperature,battery,last_seen,firmware,transport,state,created_at,updated_at
       FROM public.device_registry
       WHERE ($1::text IS NULL OR owner_id = $1::text)
         AND ($2::text IS NULL OR project_id = $2::text)
       ORDER BY name ASC`,
      [ownerId ?? null, projectId ?? null],
    );
    return result.rows.map((row) => ({
      deviceId: String(row.device_id),
      name: String(row.name),
      type: String(row.type || "ESP32 Device"),
      lifecycle: String(row.lifecycle) as "provisioning" | "online" | "offline" | "disabled",
      online: Boolean(row.online),
      temperature: Number(row.temperature ?? 0),
      battery: Number(row.battery ?? 0),
      lastSeen: row.last_seen ? new Date(String(row.last_seen)).toISOString() : null,
      firmware: row.firmware ? String(row.firmware) : null,
      transport: String(row.transport || "unknown"),
      state: row.state && typeof row.state === "object" ? row.state : {},
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    }));
  } catch {
    return [];
  }
}
