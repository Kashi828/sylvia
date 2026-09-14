import {NextResponse} from 'next/server';
import {store, validBearer,authenticateDeviceToken} from '@/lib/store';

export async function GET(request: Request) {
  const token = validBearer(request);
  if (!token) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const device = authenticateDeviceToken(token);
  if (!device) return NextResponse.json({ok:false,error:'Device not found'},{status:404});

  const pin = Number(new URL(request.url).searchParams.get('pin'));
  if (!Number.isInteger(pin) || pin < 0 || pin > 255) {
    return NextResponse.json({ok:false,error:'pin must be an integer from 0 to 255'},{status:400});
  }

  const stream = store.streams.find(s => s.deviceId === device.id && s.id === pin + 1);
  if (!stream) {
    return NextResponse.json({ok:false,error:`No datastream mapped to V${pin}`},{status:404});
  }

  return NextResponse.json({ok:true,pin,value:stream.value,datastreamId:stream.id});
}
