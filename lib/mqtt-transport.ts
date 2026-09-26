import mqtt, { type MqttClient } from "mqtt";
import { ingestMqttTelemetry } from "./mqtt-telemetry";
import { markDeviceSeen } from "./device-registry";
import { listPersistentDatastreams } from "./persistent-datastreams";
import { findPersistentDeviceByToken } from "./persistent-devices";
import { persistTelemetry } from "./telemetry-persistence";

let client: MqttClient | null = null;
let connected = false;
let subscriptionsReady = false;
let connectionCount = 0;
let reconnectCount = 0;
let lastConnectedAt: string | null = null;
let lastDisconnectedAt: string | null = null;
let lastError: string | null = null;
let subscriptionPromise: Promise<void> | null = null;

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
    subscriptionsReady,
    connectionCount,
    reconnectCount,
    lastConnectedAt,
    lastDisconnectedAt,
    lastError,
  };
}

function subscriptionTopics() {
  const prefix = topicPrefix();
  return [
    prefix + "/devices/+/telemetry",
    prefix + "/devices/+/heartbeat",
    prefix + "/devices/+/command-ack",
  ];
}

function restoreSubscriptions(activeClient: MqttClient) {
  subscriptionsReady = false;
  subscriptionPromise = new Promise<void>((resolve, reject) => {
    activeClient.subscribe(subscriptionTopics(), { qos: 1 }, (error) => {
      if (error) {
        subscriptionsReady = false;
        lastError = error.message || "MQTT subscription restore failed";
        reject(error);
        return;
      }
      subscriptionsReady = true;
      lastError = null;
      resolve();
    });
  });
  void subscriptionPromise.catch(() => undefined);
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
      const wasConnected = connected;
      connected = true;
      ++connectionCount;
      if (wasConnected) ++reconnectCount;
      lastConnectedAt = new Date().toISOString();
      restoreSubscriptions(client!);
    });
    client.on("message", (topic, raw) => {
      void handleDeviceMessage(topic, raw);
    });
    client.on("close", () => {
      connected = false;
      subscriptionsReady = false;
      lastDisconnectedAt = new Date().toISOString();
    });
    client.on("error", (error) => {
      connected = false;
      subscriptionsReady = false;
      lastError = error?.message || "MQTT connection error";
    });

  }

  if (client.connected) {
    if (subscriptionsReady) return client;
    if (subscriptionPromise) {
      await Promise.race([
        subscriptionPromise,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("MQTT subscription restore timeout")), 5000)),
      ]);
      return client;
    }
  }

  return new Promise<MqttClient>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MQTT connection timeout")), 5000);
    client!.once("connect", () => {
      clearTimeout(timer);
      const subscriptions = subscriptionPromise || Promise.resolve();
      void subscriptions.then(() => resolve(client!)).catch(reject);
    });
    client!.once("error", (error) => {
      clearTimeout(timer);
      lastError = error?.message || "MQTT connection error";
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
