import { getDb } from "./db";
import { addTelemetrySample, getTelemetry, type TelemetrySample } from "./telemetry-store";

export async function persistTelemetry(sample: TelemetrySample) {
  const db = getDb?.();
  if (!db) return addTelemetrySample(sample);

  try {
    await db.query(
      `INSERT INTO telemetry_events
       (device_id, datastream_id, value, occurred_at)
       VALUES ($1, $2, $3, $4)`,
      [
        sample.deviceId,
        sample.streamId,
        typeof sample.value === "number" ? sample.value : null,
        sample.timestamp,
      ],
    );
    return sample;
  } catch {
    // Keep the beta usable when the database schema/config is unavailable.
    return addTelemetrySample(sample);
  }
}

export async function loadPersistedTelemetry(deviceId?: string, streamId?: string) {
  const db = getDb?.();
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
      `SELECT device_id, datastream_id, value, occurred_at
       FROM telemetry_events ${where}
       ORDER BY occurred_at DESC
       LIMIT 5000`,
      values,
    );

    return result.rows.map((row: any) => ({
      deviceId: row.device_id,
      streamId: row.datastream_id,
      key: row.datastream_id,
      value: row.value === null ? null : Number(row.value),
      timestamp: new Date(row.occurred_at).toISOString(),
      transport: "mqtt" as const,
    }));
  } catch {
    return getTelemetry(deviceId, streamId);
  }
}
