import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    product: 'SYLVIA',
    transport: 'mqtt',
    status: 'ready',
    broker: process.env.SYLVIA_MQTT_BROKER || 'mqtt://localhost:1883',
    topics: {
      telemetry: 'sylvia/{deviceId}/{stream}',
      command: 'sylvia/{deviceId}/command',
      heartbeat: 'sylvia/{deviceId}/heartbeat'
    },
    note: 'Broker credentials and production broker deployment are intentionally external to the demo package.'
  });
}
