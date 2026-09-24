import { getPool } from "./db";
import { addTelemetrySample, getTelemetry, type TelemetrySample } from "./telemetry-store";

export async function persistTelemetry(sample: TelemetrySample) {
  const db = getPool();
  if (!db) return addTelemetrySample(sample);

  try {
    await db.query("BEGIN");
    try {
      await db.query(
        `INSERT INTO telemetry_events
         (device_id, datastream_id, value, value_json, occurred_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          sample.deviceId,
          sample.streamId,
          typeof sample.value === "number" ? sample.value : null,
          JSON.stringify(sample.value),
          sample.timestamp,
        ],
      );
      await db.query(
        `UPDATE public.datastream_registry
         SET last_value_json=$1::jsonb,last_occurred_at=$2,updated_at=now()
         WHERE datastream_id=$3 AND device_id=$4`,
        [JSON.stringify(sample.value), sample.timestamp, sample.streamId, sample.deviceId],
      );
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
    return sample;
  } catch {
    return addTelemetrySample(sample);
  }
}

export async function loadPersistedTelemetry(deviceId?: string, streamId?: string) {
  const db = getPool();
  if (!db) return getTelemetry(deviceId, streamId);

  try {
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (deviceId) {
      values.push(deviceId);
      clauses.push(`device_id = $${values.length}`);
    }
    if (streamId) {
      values.push(streamId);
      clauses.push(`datastream_id = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT device_id, datastream_id, value, value_json, metadata, occurred_at
       FROM telemetry_events ${where}
       ORDER BY occurred_at DESC
       LIMIT 5000`,
      values,
    );

    return result.rows.map((row: any) => ({
      deviceId: row.device_id,
      streamId: row.datastream_id,
      key: row.datastream_id,
      value: row.value_json !== null && row.value_json !== undefined
        ? row.value_json
        : row.value === null
          ? null
          : Number(row.value),
      timestamp: new Date(row.occurred_at).toISOString(),
      transport: row.metadata?.transport === "rest" ? "rest" as const : "mqtt" as const,
    }));
  } catch {
    return getTelemetry(deviceId, streamId);
  }
}
