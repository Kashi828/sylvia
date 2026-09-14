import fs from 'node:fs';
import mqtt from 'mqtt';

const BROKER = process.env.SYLVIA_MQTT_BROKER;
const TOPIC_PREFIX = process.env.SYLVIA_MQTT_TOPIC_PREFIX || 'sylvia';
const PUBLIC_BASE_URL = (process.env.SYLVIA_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const BRIDGE_TOKEN = process.env.SYLVIA_BRIDGE_TOKEN || '';
const TLS_ENABLED = process.env.SYLVIA_MQTT_TLS === 'true' || /^mqtts:/i.test(BROKER || '');
const CA_FILE = process.env.SYLVIA_MQTT_CA_FILE || '';

if (!BROKER || !PUBLIC_BASE_URL || !BRIDGE_TOKEN) {
  console.error('Missing SYLVIA_MQTT_BROKER, SYLVIA_PUBLIC_BASE_URL, or SYLVIA_BRIDGE_TOKEN');
  process.exit(1);
}
if (!/^https:\/\//i.test(PUBLIC_BASE_URL)) {
  console.error('SYLVIA_PUBLIC_BASE_URL must use https:// for a hosted deployment');
  process.exit(1);
}
if (TLS_ENABLED && CA_FILE && !fs.existsSync(CA_FILE)) {
  console.error(`SYLVIA_MQTT_CA_FILE does not exist: ${CA_FILE}`);
  process.exit(1);
}

const topics = `${TOPIC_PREFIX}/devices/+/telemetry`;
const mqttOptions = {
  username: process.env.SYLVIA_MQTT_USERNAME || undefined,
  password: process.env.SYLVIA_MQTT_PASSWORD || undefined,
  clientId: process.env.SYLVIA_MQTT_BRIDGE_CLIENT_ID || `sylvia-bridge-${process.pid}`,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: Number(process.env.SYLVIA_MQTT_CONNECT_TIMEOUT_MS || 10000),
  ...(TLS_ENABLED ? { rejectUnauthorized: true, ...(CA_FILE ? { ca: fs.readFileSync(CA_FILE) } : {}) } : {}),
};

const client = mqtt.connect(BROKER, mqttOptions);

client.on('connect', () => {
  console.log(`[sylvia-bridge] connected; subscribing ${topics}; tls=${TLS_ENABLED}`);
  client.subscribe(topics, { qos: 1 }, err => {
    if (err) console.error('[sylvia-bridge] subscribe failed:', err.message);
  });
});
client.on('reconnect', () => console.log('[sylvia-bridge] reconnecting'));
client.on('error', err => console.error('[sylvia-bridge] mqtt error:', err.message));

const forward = async (deviceId, body, token) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${PUBLIC_BASE_URL}/api/v1/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-sylvia-bridge-token': BRIDGE_TOKEN },
      body: JSON.stringify({ ...body, deviceId }),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`[sylvia-bridge] telemetry ${deviceId} rejected: ${response.status}`);
  } catch (err) {
    console.error(`[sylvia-bridge] forwarding ${deviceId} failed:`, err?.message || err);
  } finally { clearTimeout(timer); }
};

client.on('message', async (topic, raw) => {
  const prefix = `${TOPIC_PREFIX}/devices/`;
  const rest = topic.startsWith(prefix) ? topic.slice(prefix.length) : '';
  const parts = rest.split('/');
  if (parts.length !== 2 || parts[1] !== 'telemetry') return;
  let body;
  try { body = JSON.parse(raw.toString('utf8')); } catch { return; }
  if (!body || !['number', 'string', 'boolean'].includes(typeof body.value)) return;
  const deviceId = parts[0];
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || !deviceId) return;
  await forward(deviceId, body, token);
});

const shutdown = () => client.end(false, {}, () => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
