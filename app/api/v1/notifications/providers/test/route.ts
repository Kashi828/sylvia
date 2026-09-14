import { NextResponse } from 'next/server';
import { testNotificationProvider } from '@/lib/notification-delivery';
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.providerId) return NextResponse.json({error:'providerId is required'},{status:400});
    const delivery = await testNotificationProvider(body.providerId, body.severity);
    if (!delivery) return NextResponse.json({error:'Provider not found'},{status:404});
    return NextResponse.json({delivery});
  } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
}
