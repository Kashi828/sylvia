import { findDevice, validBearer } from "./store";
import { addTelemetrySample } from "./telemetry-store";
import { markDeviceSeen } from "./device-registry";
import { findPersistentDeviceByToken, markPersistentDeviceOnline } from "./persistent-devices";
import { listPersistentDatastreams } from "./persistent-datastreams";

export type MqttTelemetrySample = {
  deviceId: string;
  streamId?: string;
  key: string;
  value: number | string | boolean;
  timestamp?: string;
  firmware?: string;
  transport?: "mqtt" | "rest";
};

export async function ingestMqttTelemetry(sample: MqttTelemetrySample, token?: string) {
  if (!sample.deviceId || !sample.key) throw new Error("deviceId and key are required");
  if (!token) throw new Error("Unauthorized");

  const numericId = Number(sample.deviceId);
  const persistent = await findPersistentDeviceByToken(token, sample.deviceId);

  if (!persistent && (!Number.isFinite(numericId) || !validBearer(token, numericId))) {
    throw new Error("Unauthorized");
  }

  const memoryDevice = Number.isFinite(numericId) ? findDevice(numericId) : undefined;
  const timestamp = sample.timestamp || new Date().toISOString();
  const streamId = sample.streamId || sample.key;

  if (persistent) {
    const registered = await listPersistentDatastreams(sample.deviceId);
    const stream = registered.find(item => item.id === streamId);
    if (!stream) throw new Error("Datastream not found for device");
    const validType =
      (stream.type === "Number" && typeof sample.value === "number" && Number.isFinite(sample.value)) ||
      (stream.type === "Boolean" && typeof sample.value === "boolean") ||
      (stream.type === "String" && typeof sample.value === "string");
    if (!validType) throw new Error("Telemetry value does not match datastream type");
  }

  const stored = addTelemetrySample({
    deviceId: sample.deviceId,
    streamId,
    key: sample.key,
    value: sample.value,
    timestamp,
    transport: sample.transport || "mqtt",
  });

  if (persistent) {
    await markPersistentDeviceOnline(sample.deviceId, {
      transport: "mqtt",
      firmware: sample.firmware,
      temperature: sample.key.toLowerCase().includes("temp") && typeof sample.value === "number" ? sample.value : undefined,
      battery: sample.key.toLowerCase().includes("battery") && typeof sample.value === "number" ? sample.value : undefined,
    });
  } else if (memoryDevice) {
    memoryDevice.online = true;
    memoryDevice.lastSeen = timestamp;
  }

  void markDeviceSeen(sample.deviceId, { transport: "mqtt", firmware: sample.firmware });
  return stored;
}
