import {NextResponse} from 'next/server';
import {store, validBearer,authenticateDeviceToken} from '@/lib/store';

export async function POST(request: Request) {
  const token = validBearer(request);
  if (!token) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const device = authenticateDeviceToken(token);
  if (!device) return NextResponse.json({ok:false,error:'Device not found'},{status:404});

  device.online = true;
  device.lastSeen = new Date().toISOString();

  return NextResponse.json({
    ok:true,
    deviceId:device.id,
    online:true,
    lastSeen:device.lastSeen
  });
}
