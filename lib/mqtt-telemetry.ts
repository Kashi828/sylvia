import { findDevice, validBearer } from "./store";
import { addTelemetrySample } from "./telemetry-store";
import { markDeviceSeen } from "./device-registry";

export type MqttTelemetrySample = {
  deviceId: string;
  streamId?: string;
  key: string;
  value: number | string | boolean;
  timestamp?: string;
  firmware?: string;
};

export function ingestMqttTelemetry(sample: MqttTelemetrySample, token?: string) {
  if (!sample.deviceId || !sample.key) throw new Error("deviceId and key are required");
  const numericId = Number(sample.deviceId);
  if (!findDevice(numericId)) throw new Error("Device not found");
  if (!token || !validBearer(token, numericId)) throw new Error("Unauthorized");
  const timestamp = sample.timestamp || new Date().toISOString();
  const streamId = sample.streamId || sample.key;
  const stored = addTelemetrySample({
    deviceId: sample.deviceId, streamId, key: sample.key, value: sample.value, timestamp, transport: "mqtt",
  });
  void markDeviceSeen(sample.deviceId, { transport: "mqtt", firmware: sample.firmware });
  return stored;
}
