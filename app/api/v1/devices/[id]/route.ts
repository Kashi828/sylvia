import { NextResponse } from 'next/server';
import { findDevice, findStream, validBearer, publicDevice } from '@/lib/store';
import { findPersistentDeviceById, findPersistentDeviceByToken } from '@/lib/persistent-devices';
import { getSessionUser, sessionCookie } from '@/lib/auth';

function hasSession(request: Request) {
  const token = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  return Boolean(getSessionUser(token));
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const numericId=Number(id);
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim() || '';
  const persistent = bearer
    ? await findPersistentDeviceByToken(bearer,id)
    : null;

  if (!hasSession(request) && !persistent && (!Number.isFinite(numericId) || !validBearer(request,numericId))) {
    return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  }

  const device = persistent || await findPersistentDeviceById(id) || (Number.isFinite(numericId) ? findDevice(numericId) : null);
  if(!device) return NextResponse.json({ok:false,error:'Device not found'},{status:404});

  const streams = Number.isFinite(numericId)
    ? [1,2,3,4,5,6].map(streamId=>findStream(streamId)).filter((s): s is NonNullable<typeof s> => Boolean(s)).filter(s=>s.deviceId===numericId)
    : [];

  return NextResponse.json({ok:true,device:publicDevice(device),datastreams:streams});
}
