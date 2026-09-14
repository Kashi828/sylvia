import {NextResponse} from 'next/server';
import {store, validBearer, addEvent,authenticateDeviceToken} from '@/lib/store';
import {withRateLimit} from '@/lib/http';

export async function POST(request: Request) {
  const limited = withRateLimit(request, 60);
  if (limited) return limited;

  const token = validBearer(request);
  if (!token) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const device = authenticateDeviceToken(token);
  if (!device) return NextResponse.json({ok:false,error:'Device not found'},{status:404});

  const body = await request.json().catch(() => null) as {pin?:number; value?:unknown}|null;
  const pin = Number(body?.pin);

  if (!Number.isInteger(pin) || pin < 0 || pin > 255) {
    return NextResponse.json({ok:false,error:'pin must be an integer from 0 to 255'},{status:400});
  }

  const stream = store.streams.find(s => s.deviceId === device.id && s.id === pin + 1);
  if (!stream) {
    return NextResponse.json({ok:false,error:`No datastream mapped to V${pin}`},{status:404});
  }

  let value = body?.value;
  if (stream.type === 'Number') {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return NextResponse.json({ok:false,error:`V${pin} expects a numeric value`},{status:400});
    }
    value = number;
  }
  if (stream.type === 'Boolean') {
    if (typeof value === 'string') value = value === 'true' || value === '1';
    if (typeof value !== 'boolean') {
      return NextResponse.json({ok:false,error:`V${pin} expects a boolean value`},{status:400});
    }
  }

  stream.value = value as never;
  stream.updatedAt = new Date().toISOString();
  device.online = true;
  device.lastSeen = stream.updatedAt;
  addEvent('virtual_write', `${device.name} → V${pin}: ${String(value)}`, device.id, stream.id);

  return NextResponse.json({
    ok:true,
    pin,
    value,
    deviceId:device.id,
    datastreamId:stream.id
  });
}
