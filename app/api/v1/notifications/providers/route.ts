import { NextResponse } from 'next/server';
import { deleteNotificationProvider, listNotificationProviders, upsertNotificationProvider } from '@/lib/notification-providers';
import { listNotificationDeliveries } from '@/lib/notification-delivery';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('deliveries') === '1') return NextResponse.json({deliveries:listNotificationDeliveries(100)});
  return NextResponse.json({providers:listNotificationProviders()});
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !['webhook','email-http','push-http','console'].includes(body.kind)) return NextResponse.json({error:'name and a supported kind are required'},{status:400});
    return NextResponse.json({provider:upsertNotificationProvider(body)},{status:201});
  } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({error:'id is required'},{status:400});
  return NextResponse.json({deleted:deleteNotificationProvider(id)});
}
