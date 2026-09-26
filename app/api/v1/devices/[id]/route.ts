import { NextResponse } from 'next/server';
import { findDevice, findStream, validBearer, publicDevice } from '@/lib/store';
import { findPersistentDeviceById, findPersistentDeviceByToken } from '@/lib/persistent-devices';
import { requestPrincipal } from '@/lib/request-auth';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const numericId=Number(id);
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim() || '';
  const auth=await requestPrincipal(request);

  const persistent=bearer
    ? await findPersistentDeviceByToken(bearer,id)
    : auth
      ? await findPersistentDeviceById(id,auth.ownerId,auth.projectId)
      : null;

  if(!persistent && !auth && (!Number.isFinite(numericId)||!validBearer(request,numericId))){
    return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  }

  const device=persistent || (auth
    ? await findPersistentDeviceById(id,auth.ownerId,auth.projectId)
    : (Number.isFinite(numericId)?findDevice(numericId):null));
  if(!device)return NextResponse.json({ok:false,error:'Device not found'},{status:404});

  const streams=Number.isFinite(numericId)
    ? [1,2,3,4,5,6].map(streamId=>findStream(streamId)).filter((s):s is NonNullable<typeof s> => Boolean(s)).filter(s=>s.deviceId===numericId)
    : [];

  return NextResponse.json({ok:true,projectId:auth?.projectId,device:publicDevice(device),state:(device as typeof device & {state?:Record<string,unknown>}).state||{},datastreams:streams});
}
