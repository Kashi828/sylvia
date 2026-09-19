import {NextResponse} from 'next/server';
import {store, validBearer, authenticateDeviceToken} from '@/lib/store';
import {findPersistentDeviceByToken, markPersistentDeviceOnline} from '@/lib/persistent-devices';

export async function POST(request: Request) {
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||'';
  if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const persistent=await findPersistentDeviceByToken(token);
  if(persistent){
    const updated=await markPersistentDeviceOnline(persistent.id,{transport:'rest'});
    return NextResponse.json({ok:true,deviceId:persistent.id,online:true,lastSeen:updated?.lastSeen||new Date().toISOString(),persistent:true});
  }

  const authToken=validBearer(request);
  if(!authToken)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const device=authenticateDeviceToken(authToken);
  if(!device)return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  device.online=true;device.lastSeen=new Date().toISOString();

  return NextResponse.json({ok:true,deviceId:device.id,online:true,lastSeen:device.lastSeen,persistent:false});
}