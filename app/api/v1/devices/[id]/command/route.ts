import { NextResponse } from "next/server";
import { addEvent, queueCommand, markCommandInFlight, validBearer, publicDevice, findDevice } from "@/lib/store";
import { findPersistentDeviceByToken, findPersistentDeviceById } from "@/lib/persistent-devices";
import { publishDeviceCommand, mqttStatus } from "@/lib/mqtt-transport";
import { withRateLimit } from "@/lib/http";
import { getSessionUserAsync, sessionCookie } from "@/lib/auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { authenticateProjectApiKey } from "@/lib/project-api-keys";
import { recordDeviceEvent } from "@/lib/device-events";
import { validateCommand } from "@/lib/command-policy";
import { createPersistentCommand, generatePersistentCommandId, markPersistentCommandSent, persistentCommandsAvailable, requeuePersistentCommand } from "@/lib/persistent-commands";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,30); if(limited)return limited;
  const {id}=await params;

  const rawToken=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim() || "";
  const projectKey=rawToken ? await authenticateProjectApiKey(rawToken) : null;
  const sessionToken=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];
  const sessionUser= sessionToken ? await getSessionUserAsync(sessionToken) : null;
  if(sessionUser){const access=await requireWorkspaceRole(sessionUser,"sylvia-local-workspace","Builder");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});}

  const persistentByToken=rawToken ? await findPersistentDeviceByToken(rawToken,id) : null;
  const persistentById=sessionUser ? await findPersistentDeviceById(id, sessionUser.id) : projectKey ? await findPersistentDeviceById(id, projectKey.ownerId) : null;
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
  const commandError=validateCommand(command,payload);
  if(commandError)return NextResponse.json({ok:false,error:commandError},{status:400});

  const persistentReady=persistentCommandsAvailable();
  const commandId=persistentReady ? generatePersistentCommandId() : queueCommand(device.id,command,payload).id;
  const persistentCommand=persistentReady
    ? await createPersistentCommand(commandId,device.id,command,payload)
    : null;

  if (persistentReady && !persistentCommand) {
    addEvent("device.command.persist_failed",device.name + ": " + command + " was rejected because the persistent command record could not be created",device.id);
    return NextResponse.json(
      {ok:false,error:"Persistent command storage unavailable; command was not dispatched",commandId},
      {status:503},
    );
  }

  let dispatched=false;
  let dispatchError:string|undefined;

  if(mqttStatus().configured){
    try{
      if (persistentReady) {
        const sent = await markPersistentCommandSent(commandId);
        if (!sent) throw new Error("Persistent command could not be marked sent");
      } else {
        markCommandInFlight(commandId);
      }
      await publishDeviceCommand(String(device.id),{commandId,command,payload,timestamp:new Date().toISOString()});
      dispatched=true;
      addEvent("device.command.dispatched",device.name + ": " + command + " dispatched over MQTT",device.id);
    await recordDeviceEvent({deviceId:device.id,ownerId:sessionUser?.id || projectKey?.ownerId,kind:"device.command.dispatched",severity:"success",message:device.name + ": " + command + " dispatched",data:{commandId,command,transport:"mqtt"}});
    }catch(error){
      dispatchError=error instanceof Error?error.message:"MQTT dispatch failed";
      if (persistentReady) await requeuePersistentCommand(commandId);
      addEvent("device.command.dispatch_failed",device.name + ": " + command + " remained queued (" + dispatchError + ")",device.id);
    await recordDeviceEvent({deviceId:device.id,ownerId:sessionUser?.id,kind:"device.command.dispatch_failed",severity:"warning",message:device.name + ": " + command + " remained queued",data:{commandId,command,error:dispatchError||"unknown"}});
    }
  }else{
    dispatchError="MQTT broker is not configured; command remains queued for SDK polling";
  }

  return NextResponse.json({ok:true,queued:true,dispatched,dispatchError,transport:dispatched?"mqtt":"queue",command,payload:body?.payload??null,commandId,device:publicDevice(device)});
}