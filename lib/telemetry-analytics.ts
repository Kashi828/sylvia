import { loadPersistedTelemetry } from "./telemetry-persistence";

export type Bucket = {
  start: string;
  end: string;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
};

export async function queryTelemetry(
  deviceId: string,
  streamId: string,
  from?: string,
  to?: string,
  limit = 5000,
) {
  const rows = await loadPersistedTelemetry(deviceId, streamId);
  const start = from ? Date.parse(from) : -Infinity;
  const end = to ? Date.parse(to) : Infinity;

  return rows
    .filter(r => {
      const t = Date.parse(r.timestamp);
      return t >= start && t <= end;
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-Math.min(Math.max(limit, 1), 5000));
}

export function aggregateNumeric(
  rows: Awaited<ReturnType<typeof queryTelemetry>>,
  bucketMs: number,
): Bucket[] {
  if (!rows.length) return [];

  const numeric = rows.filter((r): r is typeof r & { value: number } =>
    typeof r.value === "number"
  );
  if (!numeric.length) return [];

  const buckets = new Map<number, number[]>();
  for (const row of numeric) {
    const t = Date.parse(row.timestamp);
    const bucket = Math.floor(t / bucketMs) * bucketMs;
    const values = buckets.get(bucket) ?? [];
    values.push(row.value);
    buckets.set(bucket, values);
  }

  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([start, values]) => ({
    start: new Date(start).toISOString(),
    end: new Date(start + bucketMs).toISOString(),
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}
