import { NextResponse } from 'next/server';
import { databaseConfigured, getDatabaseUrl, query } from '@/lib/db';
import { ensureMqtt, mqttStatus } from '@/lib/mqtt-transport';

export const dynamic = 'force-dynamic';

const DEPLOYMENT_MARKER = 'v0.53.2-rest-first-hardware';

function present(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function safeDatabaseTarget(): { host: string | null; port: string | null; database: string | null } {
  const raw = getDatabaseUrl();
  if (!raw) return { host: null, port: null, database: null };
  try {
    const url = new URL(raw);
    return {
      host: url.hostname || null,
      port: url.port || null,
      database: url.pathname.replace(/^\//, '') || null,
    };
  } catch {
    return { host: null, port: null, database: null };
  }
}

function safeError(error: unknown): { code: string | null; message: string | null } {
  if (!(error instanceof Error)) return { code: null, message: 'Unknown connection error' };
  const candidate = error as Error & { code?: string };
  let message = candidate.message || 'Connection failed';
  message = message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgresql://[redacted]');
  message = message.replace(/password=[^\s&]+/gi, 'password=[redacted]');
  message = message.replace(/mqtts?:\/\/[^\s]+/gi, 'mqtt://[redacted]');
  return {
    code: typeof candidate.code === 'string' ? candidate.code : null,
    message,
  };
}

export async function GET() {
  let databaseError: { code: string | null; message: string | null } = { code: null, message: null };
  let mqttError: { code: string | null; message: string | null } = { code: null, message: null };
  const runtimeSchema = { configured: false, connected: false, missingTables: [] as string[] };

  const db = { configured: databaseConfigured(), connected: false };
  if (db.configured) {
    try {
      await query('select 1');
      db.connected = true;
      const requiredTables = ['device_registry','telemetry_events','datastream_registry','sylvia_device_commands'];
      const schemaResult = await query(
        `select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])`,
        [requiredTables],
      );
      const presentTables = new Set(schemaResult.rows.map(row => String(row.table_name)));
      runtimeSchema.configured = true;
      runtimeSchema.connected = requiredTables.every(table => presentTables.has(table));
      runtimeSchema.missingTables = requiredTables.filter(table => !presentTables.has(table));
    } catch (error) {
      databaseError = safeError(error);
    }
  }

  let mqtt = mqttStatus();
  if (mqtt.configured && !mqtt.connected) {
    try {
      await ensureMqtt();
    } catch (error) {
      mqttError = safeError(error);
    }
    mqtt = mqttStatus();
  }

  const restReady = db.configured && db.connected && runtimeSchema.connected;
  const realtimeReady = restReady && mqtt.configured && mqtt.connected;
  const ready = realtimeReady;
  const databaseEnv = ['POSTGRES_URL'].filter(present);
  const mqttEnv = [
    'SYLVIA_MQTT_BROKER',
    'SYLVIA_MQTT_USERNAME',
    'SYLVIA_MQTT_PASSWORD',
    'SYLVIA_MQTT_CLIENT_ID',
    'SYLVIA_MQTT_TLS',
    'SYLVIA_MQTT_CA_FILE',
    'SYLVIA_MQTT_CONNECT_TIMEOUT_MS',
    'SYLVIA_MQTT_TOPIC_PREFIX',
  ].filter(present);

  return NextResponse.json({
    ok: true,
    ready,
    restReady,
    realtimeReady,
    service: 'sylvia',
    version: '0.53.1',
    deployment: DEPLOYMENT_MARKER,
    checks: { database: db, runtimeSchema, mqtt },
    diagnostics: {
      databaseProvider: 'supabase-postgres',
      databaseUrlResolved: Boolean(getDatabaseUrl()),
      databaseTarget: safeDatabaseTarget(),
      databaseEnv,
      databaseError,
      mqttEnv,
      mqttError,
      nodeEnv: process.env.NODE_ENV || 'unknown',
      commandTransport: ['mqtt', 'rest-poll'],
    },
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 });
}
