import {NextResponse} from 'next/server';
import {addEvent,findDeviceByToken,queueCommand,validBearer,publicDevice} from '@/lib/store';
export async function POST(request:Request){
 const token=validBearer(request);if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 const device=findDeviceByToken(token);if(!device)return NextResponse.json({ok:false,error:'Device not found'},{status:404});
 const body=await request.json().catch(()=>null) as {command?:string;payload?:unknown}|null;
 const command=body?.command?.trim();if(!command||command.length>80||!/^[a-zA-Z0-9_.:-]+$/.test(command))return NextResponse.json({ok:false,error:'Invalid command name'},{status:400});
 const queued=queueCommand(device.id,command,body?.payload??null);addEvent('device.command',`${device.name}: ${command} queued`,device.id);
 return NextResponse.json({ok:true,queued:true,command,payload:body?.payload??null,commandId:queued.id,device:publicDevice(device)});
}
