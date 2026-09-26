import { query, databaseConfigured } from "@/lib/db";
import { DEFAULT_PROJECT_ID } from "@/lib/workspace-projects";

export type PersistentDatastream = {
  id: string;
  deviceId: string;
  name: string;
  type: "Number" | "Boolean" | "String";
  unit: string;
  createdAt: string;
  value: number | boolean | string | null;
  lastOccurredAt: string | null;
};

function normalize(row: Record<string, unknown>): PersistentDatastream {
  return {
    id: String(row.datastream_id),
    deviceId: String(row.device_id),
    name: String(row.name),
    type: String(row.value_type) as PersistentDatastream["type"],
    unit: String(row.unit || ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    value: row.last_value_json === null || row.last_value_json === undefined ? null : (row.last_value_json as number | boolean | string),
    lastOccurredAt: row.last_occurred_at ? new Date(String(row.last_occurred_at)).toISOString() : null,
  };
}

export function persistentDatastreamsAvailable() {
  return databaseConfigured();
}

export async function listPersistentDatastreams(deviceId?: string, projectId?: string) {
  if (!databaseConfigured()) return [];
  const result = await query(
    `SELECT datastream_id,device_id,name,value_type,unit,created_at,last_value_json,last_occurred_at
     FROM public.datastream_registry
     ${deviceId ? "WHERE device_id=$1" : ""}
     ORDER BY name ASC`,
    deviceId ? [String(deviceId)] : [],
  );
  return result.rows.map(row => normalize(row as Record<string, unknown>));
}

export async function createPersistentDatastream(
  deviceId: string,
  name: string,
  type: PersistentDatastream["type"],
  unit = "",
  projectId=DEFAULT_PROJECT_ID,
) {
  if (!databaseConfigured()) return null;
  const id = `ds_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const result = await query(
    `INSERT INTO public.datastream_registry
      (datastream_id,device_id,project_id,name,value_type,unit)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING datastream_id,device_id,name,value_type,unit,created_at,last_value_json,last_occurred_at`,
    [id, String(deviceId), projectId, name.trim(), type, unit.trim()],
  );
  return normalize(result.rows[0] as Record<string, unknown>);
}

export async function deletePersistentDatastream(id: string, ownerId?: string, projectId=DEFAULT_PROJECT_ID) {
  if (!databaseConfigured()) return false;
  if (!ownerId) return false;
  const result = await query(
    "DELETE FROM public.datastream_registry d USING public.device_registry dev WHERE d.datastream_id=$1 AND d.device_id=dev.device_id AND dev.owner_id=$2 AND dev.project_id=$3 AND d.project_id=$3 RETURNING d.datastream_id",
    [id, ownerId, projectId],
  );
  return result.rowCount === 1;
}
