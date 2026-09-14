import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    product: 'SYLVIA Device SDK Contract',
    version: '1.3',
    transports: ['REST', 'MQTT'],
    operations: ['heartbeat', 'publish datastream value', 'receive device command'],
    authorization: 'Bearer device-token'
  });
}
