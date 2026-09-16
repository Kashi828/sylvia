import { NextResponse } from 'next/server';
import { databaseConfigured, getDatabaseUrl, query } from '@/lib/db';
import { mqttStatus } from '@/lib/mqtt-transport';

export const dynamic = 'force-dynamic';

const DEPLOYMENT_MARKER = 'v0.51-supabase-db';

function present(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export async function GET() {
  const db = { configured: databaseConfigured(), connected: false };
  if (db.configured) {
    try {
      await query('select 1');
      db.connected = true;
    } catch {}
  }

  const mqtt = mqttStatus();
  const ready = db.configured && db.connected && mqtt.configured;

  const databaseEnv = ['POSTGRES_URL'].filter(present);

  const mqttEnv = [
    'SYLVIA_MQTT_BROKER',
    'SYLVIA_MQTT_USERNAME',
    'SYLVIA_MQTT_PASSWORD',
    'SYLVIA_MQTT_CLIENT_ID',
    'SYLVIA_MQTT_TLS',
    'SYLVIA_MQTT_CA_FILE',
    'SYLVIA_MQTT_CONNECT_TIMEOUT_MS',
  ].filter(present);

  return NextResponse.json({
    ok: true,
    ready,
    service: 'sylvia',
    version: '0.51.0-beta.1',
    deployment: DEPLOYMENT_MARKER,
    checks: { database: db, mqtt },
    diagnostics: {
      databaseProvider: 'supabase-postgres',
      databaseUrlResolved: Boolean(getDatabaseUrl()),
      databaseEnv,
      mqttEnv,
      nodeEnv: process.env.NODE_ENV || 'unknown',
    },
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 });
}
