import { databaseConfigured, query } from "@/lib/db";
import { publishCommand } from "@/lib/command-events";

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
    const command = result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
    if (command) publishCommand({ type: "device.command.updated", deviceId: command.deviceId, commandId: command.id, status: command.status, command: command.command, result: command.result, updatedAt: command.sentAt || new Date().toISOString() });
    return command;
  } catch { return null; }
}

export async function getPersistentCommand(id: string) {
  if (!databaseConfigured()) return null;
  try {
    const result = await query("SELECT id,device_id,command,payload,status,created_at,sent_at,acked_at,result FROM device_commands WHERE id=$1 LIMIT 1", [id]);
    const command = result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
    if (command) publishCommand({ type: "device.command.updated", deviceId: command.deviceId, commandId: command.id, status: command.status, command: command.command, result: command.result, updatedAt: command.ackedAt || new Date().toISOString() });
    return command;
  } catch { return null; }
}

export async function listPersistentPendingCommands(deviceId: string | number, limit = 10) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query("SELECT id,device_id,command,payload,status,created_at,sent_at,acked_at,result FROM device_commands WHERE device_id=$1 AND status='queued' ORDER BY created_at ASC LIMIT $2", [String(deviceId), safeLimit(limit)]);
    return result.rows.map(row => normalize(row as Record<string, unknown>));
  } catch { return []; }
}

export async function recoverStalePersistentCommands(deviceId: string | number, timeoutSeconds = 120) {
  if (!databaseConfigured()) return [];
  const timeout = Math.max(30, Math.min(Math.trunc(timeoutSeconds), 3600));
  try {
    const result = await query(
      "UPDATE device_commands SET status='failed', acked_at=now(), result=$3::jsonb WHERE device_id=$1 AND status='sent' AND sent_at IS NOT NULL AND sent_at < now() - ($2::text || ' seconds')::interval RETURNING id,device_id,command,payload,status,created_at,sent_at,acked_at,result",
      [String(deviceId), timeout, JSON.stringify({ ok: false, error: "Command acknowledgement timeout", timeoutSeconds: timeout })],
    );
    const commands = result.rows.map(row => normalize(row as Record<string, unknown>));
    for (const command of commands) publishCommand({ type: "device.command.updated", deviceId: command.deviceId, commandId: command.id, status: command.status, command: command.command, result: command.result, updatedAt: command.ackedAt || new Date().toISOString() });
    return commands;
  } catch { return []; }
}

export async function listPersistentCommands(deviceId: string | number, limit = 20) {
  if (!databaseConfigured()) return [];
  try {
    const result = await query("SELECT id,device_id,command,payload,status,created_at,sent_at,acked_at,result FROM device_commands WHERE device_id=$1 ORDER BY created_at DESC LIMIT $2", [String(deviceId), safeLimit(limit)]);
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
    const failed = resultValue !== null && typeof resultValue === "object" && "ok" in resultValue && (resultValue as {ok?: unknown}).ok === false;
    const status = failed ? "failed" : "acked";
    const result = await query("UPDATE device_commands SET status=$3, acked_at=now(), result=$4::jsonb WHERE id=$1 AND device_id=$2 AND status IN ('queued','sent') RETURNING id,device_id,command,payload,status,created_at,sent_at,acked_at,result", [id, String(deviceId), status, JSON.stringify(resultValue ?? null)]);
    return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
  } catch { return null; }
}
