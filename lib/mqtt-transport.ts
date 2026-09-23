import mqtt, { type MqttClient } from "mqtt";
import { ingestMqttTelemetry } from "./mqtt-telemetry";
import { markDeviceSeen } from "./device-registry";
import { listPersistentDatastreams } from "./persistent-datastreams";
import { persistTelemetry } from "./telemetry-persistence";

let client: MqttClient | null = null;
let connected = false;

function brokerUrl() {
  return process.env.SYLVIA_MQTT_BROKER || "mqtt://localhost:1883";
}

function topicPrefix() {
  return process.env.SYLVIA_MQTT_TOPIC_PREFIX || "sylvia";
}

export function mqttTopic(deviceId: string, channel: "command" | "state" | "telemetry" | "heartbeat") {
  return `${topicPrefix()}/devices/${deviceId}/${channel}`;
}

export function mqttStatus() {
  return {
    configured: Boolean(process.env.SYLVIA_MQTT_BROKER),
    broker: brokerUrl(),
    connected,
  };
}

export async function ensureMqtt() {
  if (client?.connected) return client;

  if (!client) {
    const broker = brokerUrl();
    const tls = /^mqtts:\//i.test(broker) || process.env.SYLVIA_MQTT_TLS === "true";
    client = mqtt.connect(broker, {
      username: process.env.SYLVIA_MQTT_USERNAME || undefined,
      password: process.env.SYLVIA_MQTT_PASSWORD || undefined,
      clientId:
        process.env.SYLVIA_MQTT_CLIENT_ID ||
        `sylvia-cloud-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 5000,
      connectTimeout: Number(process.env.SYLVIA_MQTT_CONNECT_TIMEOUT_MS || 10000),
      clean: true,
      ...(tls ? { rejectUnauthorized: true } : {}),
    });

    client.on("connect", () => {
      connected = true;
      client!.subscribe(`${topicPrefix()}/devices/+/telemetry`, { qos: 1 });
      client!.subscribe(`${topicPrefix()}/devices/+/heartbeat`, { qos: 1 });
      client!.subscribe(`${topicPrefix()}/devices/+/command-ack`, { qos: 1 });
    });
    client.on("message", (topic, raw) => {
      void handleDeviceMessage(topic, raw);
    });
    client.on("close", () => {
      connected = false;
    });
    client.on("error", () => {
      connected = false;
    });
  }

  if (client.connected) return client;

  return new Promise<MqttClient>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MQTT connection timeout")), 5000);
    client!.once("connect", () => {
      clearTimeout(timer);
      resolve(client!);
    });
    client!.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}


async function handleDeviceMessage(topic: string, raw: Buffer) {
  const prefix = `${topicPrefix()}/devices/`;
  if (!topic.startsWith(prefix)) return;
  const rest = topic.slice(prefix.length);
  const parts = rest.split("/");
  if (parts.length !== 2) return;
  const deviceId = parts[0];
  const channel = parts[1];
  let body: any;
  try { body = JSON.parse(raw.toString("utf8")); } catch { return; }
  const token = typeof body?.token === "string" ? body.token : undefined;
  if (channel === "telemetry") {
    try {
      const key = typeof body.key === "string" ? body.key : `V${body.channel}`;
      const value = body.value;
      if (!["number", "string", "boolean"].includes(typeof value)) return;
      const streamId = typeof body.datastreamId === "string" ? body.datastreamId : typeof body.streamId === "string" ? body.streamId : key;
      const persistent = await findPersistentDeviceByToken(token || "", deviceId);
      if (persistent) {
        const registered = await listPersistentDatastreams(deviceId);
        const stream = registered.find(item => item.id === streamId);
        if (!stream) return;
        const validType =
          (stream.type === "Number" && typeof value === "number" && Number.isFinite(value)) ||
          (stream.type === "Boolean" && typeof value === "boolean") ||
          (stream.type === "String" && typeof value === "string");
        if (!validType) return;
      }
      const sample = await ingestMqttTelemetry({ deviceId, key, streamId, value, timestamp: body.timestamp, firmware: body.firmware }, token);
      if (persistent) await persistTelemetry({ ...sample, transport: "mqtt" });
    } catch { /* invalid or unauthorized device telemetry is ignored */ }
  } else if (channel === "command-ack") {
    if (!token || typeof body?.commandId !== "string") return;
    const numericId = Number(deviceId);
    try {
      const { findPersistentDeviceByToken } = await import("./persistent-devices");
      const persistent = await findPersistentDeviceByToken(token, deviceId);
      if (!persistent && !Number.isFinite(numericId)) return;
      if (!persistent) {
        const { authenticateDeviceToken } = await import("./store");
        if (!authenticateDeviceToken(token, numericId)) return;
      }
      if (persistent) {
        const { ackPersistentCommand } = await import("./persistent-commands");
        const command = await ackPersistentCommand(deviceId, body.commandId, body.result ?? null);
        if (command) addCommandAckEvent(deviceId, command.command);
      } else {
        const { ackCommand } = await import("./store");
        const item = ackCommand(numericId, body.commandId, body.result ?? null);
        if (item) addCommandAckEvent(deviceId, item.command);
      }
    } catch { /* keep MQTT listener resilient */ }
  } else if (channel === "heartbeat") {
    if (!token) return;
    const numericId = Number(deviceId);
    try {
      const { findPersistentDeviceByToken, markPersistentDeviceOnline } = await import("./persistent-devices");
      const persistent = await findPersistentDeviceByToken(token, deviceId);
      if (persistent) {
        await markPersistentDeviceOnline(deviceId, {
          transport: "mqtt",
          firmware: typeof body.firmware === "string" ? body.firmware : undefined,
          temperature: typeof body.temperature === "number" ? body.temperature : undefined,
          battery: typeof body.battery === "number" ? body.battery : undefined,
          state: body.state && typeof body.state === "object" ? body.state : undefined,
        });
        const state = body.state && typeof body.state === "object"
          ? Object.fromEntries(Object.entries(body.state).filter(([, value]) => value === null || ["string","number","boolean"].includes(typeof value)))
          : {};
        const { publishState } = await import("./state-events");
        publishState({ type: "device.state.updated", deviceId, state, updatedAt: new Date().toISOString() });
        return;
      }
      if (Number.isFinite(numericId)) {
        const { validBearer } = await import("./store");
        if (validBearer(token, numericId)) await markDeviceSeen(deviceId, { transport: "mqtt", firmware: typeof body.firmware === "string" ? body.firmware : undefined });
      }
    } catch { /* keep MQTT listener resilient */ }
  }
}

function addCommandAckEvent(deviceId: string, command: string) {
  // Lazy import keeps the transport module lightweight while avoiding a circular module dependency.
  void import("./store").then(({ addEvent }) => addEvent("device.command.ack", `Device ${deviceId}: ${command} acknowledged`, deviceId));
}

export async function publishDeviceCommand(
  deviceId: string,
  payload: Record<string, unknown>,
) {
  const mqttClient = await ensureMqtt();
  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(
      mqttTopic(deviceId, "command"),
      JSON.stringify(payload),
      { qos: 1, retain: false },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}

export async function publishDeviceState(
  deviceId: string,
  payload: Record<string, unknown>,
) {
  const mqttClient = await ensureMqtt();
  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(
      mqttTopic(deviceId, "state"),
      JSON.stringify(payload),
      { qos: 1, retain: true },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
