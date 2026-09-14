import { NextResponse } from 'next/server';
import { databaseConfigured, query } from '@/lib/db';
import { mqttStatus } from '@/lib/mqtt-transport';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = { configured: databaseConfigured(), connected: false };
  if (db.configured) {
    try { await query('select 1'); db.connected = true; } catch {}
  }
  const mqtt = mqttStatus();
  const ready = db.configured && db.connected && mqtt.configured;
  return NextResponse.json({
    ok: true,
    ready,
    service: 'sylvia',
    version: '0.49.0-beta.1',
    checks: { database: db, mqtt },
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 });
}
