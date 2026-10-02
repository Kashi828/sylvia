import { NextResponse } from 'next/server';
import { findDevice, findStream, validBearer, publicDevice } from '@/lib/store';
import { deletePersistentDevice, findPersistentDeviceById, findPersistentDeviceByToken } from '@/lib/persistent-devices';
import { requestPrincipal } from '@/lib/request-auth';
import { requireWorkspaceRole } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/lib/audit-log';

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

/** Decommission a device. Requires a Builder-or-above session in the owning project. */
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const auth=await requestPrincipal(request);
  if(!auth || !auth.user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Builder');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});

  const target=await findPersistentDeviceById(id,auth.ownerId,auth.projectId);
  if(!target)return NextResponse.json({ok:false,error:'Device not found in the selected project'},{status:404});

  const deleted=await deletePersistentDevice(id,auth.ownerId,auth.projectId);
  if(!deleted)return NextResponse.json({ok:false,error:'Device could not be removed'},{status:500});

  await recordAuditEvent({
    ownerId:auth.ownerId,
    actorType:auth.method,
    actorId:auth.userId||String(auth.ownerId),
    action:'device.deleted',
    resourceType:'device',
    resourceId:String(id),
    metadata:{name:target.name,projectId:auth.projectId},
    request,
  });
  return NextResponse.json({ok:true,deleted:true,deviceId:String(id)});
}
