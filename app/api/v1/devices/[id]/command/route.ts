import {NextResponse} from 'next/server';
import {addEvent,findDevice,queueCommand,markCommandInFlight,validBearer,authenticateDeviceToken,publicDevice} from '@/lib/store';
import {publishDeviceCommand, mqttStatus} from '@/lib/mqtt-transport';
import {withRateLimit} from '@/lib/http';

const allowed=new Set(['restart','sync','identify','set_online','set_offline']);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,30); if(limited)return limited;
  const {id}=await params; const token=validBearer(request, Number(id)); if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const device=findDevice(Number(id));
  if(!device || !authenticateDeviceToken(token, device.id))return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  const body=await request.json().catch(()=>null) as {command?:string;payload?:unknown}|null;
  const command=body?.command?.trim(); if(!command || command.length>80 || !/^[a-zA-Z0-9_.:-]+$/.test(command))return NextResponse.json({ok:false,error:'Invalid command name'},{status:400});
  if(command==='set_online')device.online=true;
  if(command==='set_offline')device.online=false;
  device.lastSeen=new Date().toISOString();
  const queued=queueCommand(device.id,command,body?.payload??null);
  let dispatched = false;
  let dispatchError: string | undefined;
  if (mqttStatus().configured) {
    try {
      markCommandInFlight(queued.id);
      await publishDeviceCommand(String(device.id), {
        commandId: queued.id,
        command,
        payload: body?.payload ?? null,
        timestamp: new Date().toISOString(),
      });
      dispatched = true;
      addEvent('device.command.dispatched',`${device.name}: ${command} dispatched over MQTT`,device.id);
    } catch (error) {
      dispatchError = error instanceof Error ? error.message : 'MQTT dispatch failed';
      addEvent('device.command.dispatch_failed',`${device.name}: ${command} remained queued (${dispatchError})`,device.id);
    }
  } else {
    dispatchError = 'MQTT broker is not configured; command remains queued for SDK polling';
  }
  return NextResponse.json({ok:true,queued:true,dispatched,dispatchError,transport: dispatched ? 'mqtt' : 'queue',command,payload:body?.payload??null,commandId:queued.id,device:publicDevice(device)});
}
