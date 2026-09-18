import { NextResponse } from 'next/server';
import { getSessionUser, sessionCookie } from '@/lib/auth';
import { store, validBearer, publicDevice, createDevice } from '@/lib/store';

function sessionUser(request: Request) {
  const token = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  return getSessionUser(token);
}

export async function GET(request:Request){
  if(!validBearer(request)) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  return NextResponse.json({ok:true,count:store.devices.length,devices:store.devices.map(publicDevice)});
}

export async function POST(request:Request){
  const user=sessionUser(request);
  if(!user) return NextResponse.json({ok:false,error:'Authentication required to register a device'},{status:401});
  const body=await request.json().catch(()=>null) as {name?:string;type?:string}|null;
  const name=body?.name?.trim();
  const type=body?.type?.trim()||'ESP32 Device';
  if(!name) return NextResponse.json({ok:false,error:'name is required'},{status:400});
  const created=createDevice(name,type);
  return NextResponse.json({
    ok:true,
    device:publicDevice(created.device),
    token:created.token,
    owner:{id:user.id,name:user.name},
    message:'Device registered and waiting for its first connection',
  },{status:201});
}
