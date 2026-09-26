import {NextResponse} from 'next/server';
import {publishState} from '@/lib/state-events';
import {recordDeviceEvent} from '@/lib/device-events';
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
    const state = (body?.state && typeof body.state === 'object')
      ? Object.fromEntries(Object.entries(body.state).filter(([, value]) => value === null || ['string','number','boolean'].includes(typeof value)))
      : {};
    publishState({type:'device.state.updated',deviceId:id,state,updatedAt:new Date().toISOString()});
    await recordDeviceEvent({
      deviceId:id,
      projectId:undefined,
      kind:'device.heartbeat',
      severity:'success',
      message:`Device ${id} heartbeat received over REST`,
      data:{transport:'rest',firmware:body?.firmware||null,state},
    });
    return NextResponse.json({ok:true,deviceId:id,online:true,lastSeen:updated?.lastSeen||new Date().toISOString(),state,persistent:true});
  }
  if(!validBearer(request,Number(id)))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const d=findDevice(Number(id));if(!d)return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  d.online=true;d.lastSeen=new Date().toISOString();addEvent('device.heartbeat',`${d.name} heartbeat received`,d.id);
  return NextResponse.json({ok:true,deviceId:d.id,online:true,lastSeen:d.lastSeen,persistent:false});
}