import { NextResponse } from "next/server";
import { addEvent, queueCommand, markCommandInFlight, validBearer, publicDevice, findDevice } from "@/lib/store";
import { findPersistentDeviceByToken } from "@/lib/persistent-devices";
import { publishDeviceCommand, mqttStatus } from "@/lib/mqtt-transport";
import { withRateLimit } from "@/lib/http";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { findPersistentDeviceById } from "@/lib/persistent-devices";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,30); if(limited)return limited;
  const {id}=await params;
  const numericId=Number(id);
  if(!Number.isFinite(numericId)) return NextResponse.json({ok:false,error:"Invalid device id"},{status:400});

  const rawToken=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim() || "";
  const sessionToken=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  const sessionUser= sessionToken ? getSessionUser(sessionToken) : null;

  const persistentByToken=rawToken ? await findPersistentDeviceByToken(rawToken,id) : null;
  const persistentById=sessionUser ? await findPersistentDeviceById(id) : null;
  const device=persistentByToken || persistentById || (rawToken && validBearer(rawToken,numericId) ? findDevice(numericId) : (sessionUser ? findDevice(numericId) : null));
  if(!device) return NextResponse.json({ok:false,error:"Unauthorized or device not found"},{status:401});

  const body=await request.json().catch(()=>null) as {command?:string;payload?:unknown}|null;
  const command=body?.command?.trim();
  if(!command||command.length>80||!/^[a-zA-Z0-9_.:-]+$/.test(command)) return NextResponse.json({ok:false,error:"Invalid command name"},{status:400});

  const queued=queueCommand(device.id,command,body?.payload??null);
  let dispatched=false;
  let dispatchError:string|undefined;

  if(mqttStatus().configured){
    try{
      markCommandInFlight(queued.id);
      await publishDeviceCommand(String(device.id),{commandId:queued.id,command,payload:body?.payload??null,timestamp:new Date().toISOString()});
      dispatched=true;
      addEvent("device.command.dispatched",device.name + ": " + command + " dispatched over MQTT",device.id);
    }catch(error){
      dispatchError=error instanceof Error?error.message:"MQTT dispatch failed";
      addEvent("device.command.dispatch_failed",device.name + ": " + command + " remained queued (" + dispatchError + ")",device.id);
    }
  }else{
    dispatchError="MQTT broker is not configured; command remains queued for SDK polling";
  }

  return NextResponse.json({ok:true,queued:true,dispatched,dispatchError,transport:dispatched?"mqtt":"queue",command,payload:body?.payload??null,commandId:queued.id,device:publicDevice(device)});
}
