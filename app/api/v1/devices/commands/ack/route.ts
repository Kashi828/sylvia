import {NextResponse} from 'next/server';
import {ackCommand,addEvent,findDeviceByToken,validBearer} from '@/lib/store';
import {findPersistentDeviceByToken,markPersistentDeviceOnline} from '@/lib/persistent-devices';
import {ackPersistentCommand,persistentCommandsAvailable} from '@/lib/persistent-commands';
import {withRateLimit} from '@/lib/http';

export async function POST(request:Request){
  const limited=withRateLimit(request,60);if(limited)return limited;
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||'';
  if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const body=await request.json().catch(()=>null) as {commandId?:string;result?:unknown}|null;
  if(!body?.commandId)return NextResponse.json({ok:false,error:'commandId is required'},{status:400});

  if(persistentCommandsAvailable()){
    const persistentDevice=await findPersistentDeviceByToken(token);
    if(persistentDevice){
      const item=await ackPersistentCommand(persistentDevice.id,body.commandId,body.result??null);
      if(!item)return NextResponse.json({ok:false,error:'Command not found or already acknowledged'},{status:404});
      const updated=await markPersistentDeviceOnline(persistentDevice.id,{transport:'rest'});
      addEvent('device.command.ack',`${persistentDevice.name}: ${item.command} acknowledged`,persistentDevice.id);
      return NextResponse.json({ok:true,commandId:item.id,acknowledgedAt:item.ackedAt,result:item.result,device:updated||persistentDevice,persistent:true});
    }
  }

  const actor=validBearer(request);
  if(!actor)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const device=findDeviceByToken(actor);
  if(!device)return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  const item=ackCommand(device.id,body.commandId,body.result??null);
  if(!item)return NextResponse.json({ok:false,error:'Command not found or already acknowledged'},{status:404});
  device.online=true;device.lastSeen=new Date().toISOString();
  addEvent('device.command.ack',`${device.name}: ${item.command} acknowledged`,device.id);
  return NextResponse.json({ok:true,commandId:item.id,acknowledgedAt:item.ackedAt,result:item.result});
}