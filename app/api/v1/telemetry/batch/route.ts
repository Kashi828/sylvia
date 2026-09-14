import {NextResponse} from 'next/server';
import {findDevice,findStream,validBearer,addEvent,authenticateDeviceToken} from '@/lib/store';
import {withRateLimit} from '@/lib/http';

export async function POST(request:Request){
  const limited=withRateLimit(request,20); if(limited)return limited;
  const token=validBearer(request); if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const body=await request.json().catch(()=>null) as {items?:Array<{deviceId:number;streamId:number;value:unknown}>}|null;
  if(!Array.isArray(body?.items) || body.items.length===0 || body.items.length>100)return NextResponse.json({ok:false,error:'items must contain 1-100 readings'},{status:400});
  const accepted=[]; const rejected=[];
  for(const item of body.items){
    const device=findDevice(Number(item.deviceId)); const stream=findStream(Number(item.streamId));
    if(!device || !authenticateDeviceToken(token, device.id) || !stream || stream.deviceId!==device.id){rejected.push({deviceId:item.deviceId,streamId:item.streamId,error:'Unauthorized device/datastream'});continue;}
    stream.value=item.value as never; stream.updatedAt=new Date().toISOString(); device.online=true; device.lastSeen=stream.updatedAt;
    if(stream.name==='Temperature')device.temperature=Number(item.value);
    if(stream.name==='Battery')device.battery=Number(item.value);
    accepted.push({deviceId:device.id,streamId:stream.id,value:stream.value});
  }
  addEvent('telemetry.batch',`Accepted ${accepted.length} telemetry readings`);
  return NextResponse.json({ok:true,accepted,rejected});
}
