import { findDevice, validBearer } from "./store";
import { addTelemetrySample } from "./telemetry-store";
import { markDeviceSeen } from "./device-registry";
import { findPersistentDeviceByToken, markPersistentDeviceOnline } from "./persistent-devices";

export type MqttTelemetrySample = {
  deviceId: string;
  streamId?: string;
  key: string;
  value: number | string | boolean;
  timestamp?: string;
  firmware?: string;
};

export async function ingestMqttTelemetry(sample: MqttTelemetrySample, token?: string) {
  if (!sample.deviceId || !sample.key) throw new Error("deviceId and key are required");

  const persistent = token
    ? await findPersistentDeviceByToken(token, sample.deviceId)
    : null;

  if (!persistent) {
    const numericId = Number(sample.deviceId);
    const legacy = token ? validBearer(token, numericId) : null;
    if (!legacy || !findDevice(numericId)) throw new Error("Unauthorized");
  }

  const timestamp = sample.timestamp || new Date().toISOString();
  const streamId = sample.streamId || sample.key;
  const stored = addTelemetrySample({
    deviceId: sample.deviceId,
    streamId,
    key: sample.key,
    value: sample.value,
    timestamp,
    transport: "mqtt",
  });

  if (persistent) {
    await markPersistentDeviceOnline(sample.deviceId, {
      transport: "mqtt",
      firmware: sample.firmware,
      temperature: sample.key.toLowerCase() === "temperature" && typeof sample.value === "number" ? sample.value : undefined,
      battery: sample.key.toLowerCase() === "battery" && typeof sample.value === "number" ? sample.value : undefined,
    });
  } else {
    void markDeviceSeen(sample.deviceId, { transport: "mqtt", firmware: sample.firmware });
  }

  return stored;
}
