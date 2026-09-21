import {NextResponse} from 'next/server';
import {addEvent,findDevice,validBearer} from '@/lib/store';
import {findPersistentDeviceById,findPersistentDeviceByToken,markPersistentDeviceOnline} from '@/lib/persistent-devices';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||'';
  const body=await request.json().catch(()=>null) as {firmware?:string;temperature?:number;battery?:number;state?:Record<string,unknown>}|null;
  const persistent=token?await findPersistentDeviceByToken(token,id):null;
  if(persistent){
    const temperature=typeof body?.temperature==='number'&&Number.isFinite(body.temperature)?body.temperature:undefined;
    const battery=typeof body?.battery==='number'&&Number.isFinite(body.battery)?body.battery:undefined;
    const updated=await markPersistentDeviceOnline(id,{transport:'rest',firmware:body?.firmware,temperature,battery,state:body?.state});
    return NextResponse.json({ok:true,deviceId:id,online:true,lastSeen:updated?.lastSeen||new Date().toISOString(),persistent:true});
  }
  if(!validBearer(request,Number(id)))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const d=findDevice(Number(id));if(!d)return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  d.online=true;d.lastSeen=new Date().toISOString();addEvent('device.heartbeat',`${d.name} heartbeat received`,d.id);
  return NextResponse.json({ok:true,deviceId:d.id,online:true,lastSeen:d.lastSeen,persistent:false});
}