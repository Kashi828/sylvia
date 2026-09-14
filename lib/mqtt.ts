import mqtt, { MqttClient } from 'mqtt';

let client: MqttClient | null = null;
let connecting = false;

export function mqttConfigured() {
  return Boolean(process.env.SYLVIA_MQTT_BROKER);
}

export function mqttStatus() {
  return {
    configured: mqttConfigured(),
    broker: process.env.SYLVIA_MQTT_BROKER || 'mqtt://localhost:1883',
    connected: Boolean(client?.connected),
    connecting,
  };
}

export async function getMqttClient() {
  if (!mqttConfigured()) throw new Error('SYLVIA_MQTT_BROKER is not configured');
  if (client?.connected) return client;
  if (connecting && client) return client;
  connecting = true;
  const next = mqtt.connect(process.env.SYLVIA_MQTT_BROKER!, {
    username: process.env.SYLVIA_MQTT_USERNAME,
    password: process.env.SYLVIA_MQTT_PASSWORD,
    clientId: process.env.SYLVIA_MQTT_CLIENT_ID || `sylvia-server-${Math.random().toString(16).slice(2)}`,
    clean: true,
    reconnectPeriod: 3000,
  });
  client = next;
  await new Promise<void>((resolve, reject) => {
    const onConnect = () => { cleanup(); connecting = false; resolve(); };
    const onError = (err: Error) => { cleanup(); connecting = false; reject(err); };
    const cleanup = () => { next.off('connect', onConnect); next.off('error', onError); };
    next.once('connect', onConnect); next.once('error', onError);
  });
  return next;
}

export async function publishMqtt(topic: string, payload: unknown) {
  const c = await getMqttClient();
  await new Promise<void>((resolve, reject) => {
    c.publish(topic, JSON.stringify(payload), { qos: 1 }, err => err ? reject(err) : resolve());
  });
}
