import { NextResponse } from "next/server";
import { addEvent, queueCommand, markCommandInFlight, validBearer, publicDevice, findDevice } from "@/lib/store";
import { findPersistentDeviceByToken, findPersistentDeviceById } from "@/lib/persistent-devices";
import { publishDeviceCommand, mqttStatus } from "@/lib/mqtt-transport";
import { withRateLimit } from "@/lib/http";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { createPersistentCommand, markPersistentCommandSent, persistentCommandsAvailable } from "@/lib/persistent-commands";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,30); if(limited)return limited;
  const {id}=await params;

  const rawToken=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim() || "";
  const sessionToken=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  const sessionUser= sessionToken ? getSessionUser(sessionToken) : null;

  const persistentByToken=rawToken ? await findPersistentDeviceByToken(rawToken,id) : null;
  const persistentById=sessionUser ? await findPersistentDeviceById(id, sessionUser.id) : null;
  const numericId=Number(id);
  const legacyDevice=Number.isFinite(numericId) ? findDevice(numericId) : null;

  // Session callers may only control persistent devices owned by that session user.
  // Legacy in-memory devices remain accessible only through their explicit device bearer.
  const device=persistentByToken || persistentById || (
    !sessionUser && rawToken && legacyDevice && validBearer(rawToken,numericId)
      ? legacyDevice
      : null
  );
  if(!device) return NextResponse.json({ok:false,error:"Unauthorized or device not found"},{status:401});

  const body=await request.json().catch(()=>null) as {command?:string;payload?:unknown}|null;
  const command=body?.command?.trim();
  if(!command||command.length>80||!/^[a-zA-Z0-9_.:-]+$/.test(command)) return NextResponse.json({ok:false,error:"Invalid command name"},{status:400});

  const payload=body?.payload??null;
  if (command === "digital_write") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ok:false,error:"digital_write requires an object payload"},{status:400});
    }
    const candidate = payload as {pin?:unknown;value?:unknown};
    const pin = Number(candidate.pin);
    const value = Number(candidate.value);
    if (!Number.isInteger(pin) || pin < 0 || pin > 16 || !Number.isInteger(value) || (value !== 0 && value !== 1)) {
      return NextResponse.json({ok:false,error:"digital_write requires GPIO pin 0-16 and value 0 or 1"},{status:400});
    }
  }

  const queued=queueCommand(device.id,command,payload);
  const persistentCommand=persistentCommandsAvailable()
    ? await createPersistentCommand(queued.id,device.id,command,payload)
    : null;
  let dispatched=false;
  let dispatchError:string|undefined;

  if(mqttStatus().configured){
    try{
      markCommandInFlight(queued.id);
      await publishDeviceCommand(String(device.id),{commandId:queued.id,command,payload,timestamp:new Date().toISOString()});
      dispatched=true;
      if (persistentCommand) await markPersistentCommandSent(queued.id);
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