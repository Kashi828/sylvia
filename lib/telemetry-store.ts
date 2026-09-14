export type TelemetrySample = {
  deviceId: string;
  streamId: string;
  key: string;
  value: number | string | boolean;
  timestamp: string;
  transport: "mqtt" | "rest";
};

const MAX_SAMPLES = 5000;
const samples: TelemetrySample[] = [];

export function addTelemetrySample(sample: TelemetrySample) {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
  return sample;
}

export function getTelemetry(deviceId?: string, streamId?: string) {
  return samples.filter((s) =>
    (!deviceId || s.deviceId === deviceId) &&
    (!streamId || s.streamId === streamId)
  );
}

export function getTelemetryStats(deviceId?: string, streamId?: string) {
  const numeric = getTelemetry(deviceId, streamId)
    .filter((s): s is TelemetrySample & { value: number } =>
      typeof s.value === "number"
    );

  if (!numeric.length) {
    return { count: 0, min: null, max: null, average: null, latest: null };
  }

  const values = numeric.map(s => s.value);
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    latest: numeric[numeric.length - 1],
  };
}
