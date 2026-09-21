import { databaseConfigured, query } from "@/lib/db";

export type PersistentCommand = {
  id: string;
  deviceId: string;
  command: string;
  payload: unknown;
  status: "queued" | "sent" | "acked" | "failed";
  createdAt: string;
  sentAt: string | null;
  ackedAt: string | null;
  result: unknown;
};

function normalize(row: Record<string, unknown>): PersistentCommand {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    command: String(row.command),
    payload: row.payload ?? null,
    status: row.status as PersistentCommand["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    sentAt: row.sent_at ? new Date(String(row.sent_at)).toISOString() : null,
    ackedAt: row.acked_at ? new Date(String(row.acked_at)).toISOString() : null,
    result: row.result ?? null,
  };
}

function safeLimit(limit: number) {
  return Math.max(1, Math.min(Number.isFinite(limit) ? Math.trunc(limit) : 10, 50));
}

export function persistentCommandsAvailable() { return databaseConfigured(); }

export async function createPersistentCommand(id: string, deviceId: string | number, command: string, payload: unknown) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query("INSERT INTO device_commands (id, device_id, command, payload, status) VALUES ($1,$2,$3,$4::jsonb,'queued') ON CONFLICT (id) DO NOTHING RETURNING id,device_id,command,payload,status,created_at,sent_at,acked_at,result", [id, String(deviceId), command, JSON.stringify(payload ?? null)]);
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : await getPersistentCommand(id);
  } catch { return null; }
}

export async function markPersistentCommandSent(id: string) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query("UPDATE device_commands SET status='sent', sent_at=COALESCE(sent_at,now()) WHERE id=$1 RETURNING id,device_id,command,payload,status,created_at,sent_at,acked_at,result", [id]);
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch { return null; }
}

export async function getPersistentCommand(id: string) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query("SELECT id,device_id,command,payload,status,created_at,sent_at,acked_at,result FROM device_commands WHERE id=$1 LIMIT 1", [id]);
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch { return null; }
}

export async function listPersistentPendingCommands(deviceId: string | number, limit = 10) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query("SELECT id,device_id,command,payload,status,created_at,sent_at,acked_at,result FROM device_commands WHERE device_id=$1 AND status='queued' ORDER BY created_at ASC LIMIT $2", [String(deviceId), safeLimit(limit)]);
    return result.rows.map(row => normalize(row as Record<string, unknown>));
  } catch { return []; }
}

export async function claimPersistentCommands(deviceId: string | number, limit = 10) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query(
      "WITH picked AS (SELECT id FROM device_commands WHERE device_id=$1 AND status='queued' ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED) UPDATE device_commands c SET status='sent', sent_at=COALESCE(c.sent_at,now()) FROM picked WHERE c.id=picked.id RETURNING c.id,c.device_id,c.command,c.payload,c.status,c.created_at,c.sent_at,c.acked_at,c.result",
      [String(deviceId), safeLimit(limit)],
    );
    return result.rows
      .sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime())
      .map(row => normalize(row as Record<string, unknown>));
  } catch { return []; }
}

export async function ackPersistentCommand(deviceId: string | number, id: string, resultValue: unknown) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query("UPDATE device_commands SET status='acked', acked_at=now(), result=$3::jsonb WHERE id=$1 AND device_id=$2 RETURNING id,device_id,command,payload,status,created_at,sent_at,acked_at,result", [id, String(deviceId), JSON.stringify(resultValue ?? null)]);
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch { return null; }
}
