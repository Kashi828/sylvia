import { NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { findPersistentDeviceById, revokePersistentDeviceToken, rotatePersistentDeviceToken } from "@/lib/persistent-devices";
import { findDevice, rotateDeviceToken, validBearer } from "@/lib/store";
import { recordAuditEvent } from "@/lib/audit-log";

export const dynamic="force-dynamic";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=await requestPrincipal(request);
  if(auth){
    if(auth.method==="session"){const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Viewer");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});}
    const device=await findPersistentDeviceById(id,auth.ownerId,auth.projectId);
    if(device)return NextResponse.json({ok:true,deviceId:id,token:{generation:device.tokenGeneration??1,revoked:Boolean(device.tokenRevoked),preview:device.tokenPreview,rotatedAt:device.tokenRotatedAt??null,lastAuthenticatedAt:device.tokenLastAuthenticatedAt??null}});
  }
  return NextResponse.json({ok:false,error:"Device not found"},{status:404});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=await requestPrincipal(request);
  if(auth&&auth.method==="session"){
    const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Admin");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
    const body=await request.json().catch(()=>({})) as {action?:string}; const action=body.action==="revoke"?"revoke":"rotate";
    const device=await findPersistentDeviceById(id,auth.ownerId);
    if(!device)return NextResponse.json({ok:false,error:"Device not found"},{status:404});
    if(action==="revoke"){
      const changed=await revokePersistentDeviceToken(id,auth.ownerId,auth.projectId);
      await recordAuditEvent({ownerId:auth.ownerId,actorType:"session",actorId:auth.userId!,action:"device_token.revoked",resourceType:"device",resourceId:id,metadata:{generation:device.tokenGeneration??1,revoked:changed,projectId:auth.projectId},request});
      return NextResponse.json({ok:true,action,deviceId:id,revoked:changed});
    }
    const rotated=await rotatePersistentDeviceToken(id,auth.ownerId,auth.projectId);
    if(!rotated)return NextResponse.json({ok:false,error:"Device token rotation failed"},{status:500});
    await recordAuditEvent({ownerId:auth.ownerId,actorType:"session",actorId:auth.userId!,action:"device_token.rotated",resourceType:"device",resourceId:id,metadata:{generation:rotated.device.tokenGeneration??1,projectId:auth.projectId},request});
    return NextResponse.json({ok:true,action,deviceId:id,token:rotated.token,tokenPreview:rotated.device.tokenPreview,generation:rotated.device.tokenGeneration,message:"Copy this token now; the full secret is not shown again."});
  }
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim()||"";
  const device=findDevice(Number(id));
  if(!device||!validBearer(token,Number(id)))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const rotated=rotateDeviceToken(Number(id));
  return rotated?NextResponse.json({ok:true,deviceId:id,token:rotated.token,tokenPreview:rotated.device.tokenPreview,message:"Store this token securely. It will not be returned again."}):NextResponse.json({ok:false,error:"Device not found"},{status:404});
}