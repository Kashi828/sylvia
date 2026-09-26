import { databaseConfigured, query } from "@/lib/db";

export type DeviceEventSeverity = "info" | "warning" | "critical" | "success" | "error";

export type DeviceEvent = {
  id: string;
  ownerId: string | null;
  deviceId: string;
  kind: string;
  severity: DeviceEventSeverity;
  message: string;
  data: Record<string, unknown>;
  occurredAt: string;
};

export async function recordDeviceEvent(input: {
  deviceId: string | number;
  ownerId?: string | null;
  kind: string;
  severity?: DeviceEventSeverity;
  message: string;
  data?: Record<string, unknown>;
}) {
  if (!databaseConfigured()) return null;
  const id = `dev_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const result = await query(
      `INSERT INTO public.device_events
        (id, owner_id, device_id, kind, severity, message, data)
       VALUES ($1,COALESCE($2,(SELECT owner_id FROM public.device_registry WHERE device_id=$3 LIMIT 1)),$3,$4,$5,$6,$7::jsonb)
       RETURNING id,owner_id,device_id,kind,severity,message,data,occurred_at`,
      [
        id,
        input.ownerId ?? null,
        String(input.deviceId),
        input.kind,
        input.severity ?? "info",
        input.message,
        JSON.stringify(input.data ?? {}),
      ],
    );
    return normalize(result.rows[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

function normalize(row: Record<string, unknown>): DeviceEvent {
  return {
    id: String(row.id),
    ownerId: row.owner_id ? String(row.owner_id) : null,
    deviceId: String(row.device_id),
    kind: String(row.kind),
    severity: String(row.severity) as DeviceEventSeverity,
    message: String(row.message),
    data: row.data && typeof row.data === "object" ? row.data as Record<string, unknown> : {},
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
  };
}

export async function listDeviceEvents(ownerId: string, options?: {
  deviceId?: string;
  kind?: string;
  limit?: number;
}) {
  if (!databaseConfigured()) return [];
  const limit = Math.max(1, Math.min(Math.trunc(options?.limit ?? 100), 200));
  const values: unknown[] = [ownerId];
  const clauses = ["owner_id=$1"];

  if (options?.deviceId) {
    values.push(String(options.deviceId));
    clauses.push(`device_id=$${values.length}`);
  }
  if (options?.kind) {
    values.push(options.kind);
    clauses.push(`kind=$${values.length}`);
  }
  values.push(limit);

  try {
    const result = await query(
      `SELECT id,owner_id,device_id,kind,severity,message,data,occurred_at
       FROM public.device_events
       WHERE ${clauses.join(" AND ")}
       ORDER BY occurred_at DESC
       LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(row => normalize(row as Record<string, unknown>));
  } catch {
    return [];
  }
}
