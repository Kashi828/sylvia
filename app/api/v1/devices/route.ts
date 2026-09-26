import { NextResponse } from 'next/server';
import { store, validBearer, publicDevice, createDevice } from '@/lib/store';
import { registerPersistentDevice, persistentDevicesAvailable, listPersistentDevices } from '@/lib/persistent-devices';
import { requireWorkspaceRole } from '@/lib/workspace-auth';
import { requestPrincipal } from '@/lib/request-auth';

export async function GET(request:Request){
  if (persistentDevicesAvailable()) {
    const auth=await requestPrincipal(request);
    if(!auth)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
    const devices=await listPersistentDevices(auth.ownerId,auth.projectId);
    return NextResponse.json({ok:true,count:devices.length,devices:devices.map(publicDevice),persistent:true,projectId:auth.projectId});
  }
  const auth=await requestPrincipal(request);
  if(auth) return NextResponse.json({ok:true,count:store.devices.length,devices:store.devices.map(publicDevice),persistent:false,projectId:auth.projectId});
  if(!validBearer(request)) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  return NextResponse.json({ok:true,count:store.devices.length,devices:store.devices.map(publicDevice),persistent:false});
}

export async function POST(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=='session' || !auth.user) return NextResponse.json({ok:false,error:'Authentication required to register a device'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Builder');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>null) as {name?:string;type?:string}|null;
  const name=body?.name?.trim();
  const type=body?.type?.trim()||'ESP32 Device';
  if(!name) return NextResponse.json({ok:false,error:'name is required'},{status:400});

  try {
    const persistent=await registerPersistentDevice(name,type,auth.user.id,auth.projectId);
    if(persistent){
      return NextResponse.json({
        ok:true,
        device:publicDevice(persistent.device),
        token:persistent.token,
        owner:{id:auth.user.id,name:auth.user.name},
        projectId:auth.projectId,
        persistent:true,
        message:'Device registered in PostgreSQL and waiting for its first connection',
      },{status:201});
    }
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Persistent device registration failed'},{status:503});
  }

  const created=createDevice(name,type);
  return NextResponse.json({
    ok:true,
    device:publicDevice(created.device),
    token:created.token,
    owner:{id:auth.user.id,name:auth.user.name},
    projectId:auth.projectId,
    persistent:false,
    message:'Device registered in memory and waiting for its first connection',
  },{status:201});
}
