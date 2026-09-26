import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { findPersistentDeviceById } from "@/lib/persistent-devices";
import { createPersistentDatastream, deletePersistentDatastream, listPersistentDatastreams, persistentDatastreamsAvailable } from "@/lib/persistent-datastreams";
import { requestPrincipal } from "@/lib/request-auth";

export async function GET(request: Request) {
  const auth=await requestPrincipal(request);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const deviceId=new URL(request.url).searchParams.get("deviceId")||undefined;
  if(deviceId && !(await findPersistentDeviceById(deviceId,auth.ownerId,auth.projectId))) return NextResponse.json({ok:false,error:"Device not found"},{status:404});
  return NextResponse.json({ok:true,persistent:persistentDatastreamsAvailable(),projectId:auth.projectId,datastreams:await listPersistentDatastreams(deviceId,auth.projectId)});
}

export async function POST(request: Request) {
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,"Builder");
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>null) as { deviceId?: string; name?: string; type?: string; unit?: string } | null;
  const deviceId=body?.deviceId?.trim();
  const name=body?.name?.trim();
  const type=body?.type;
  if(!deviceId || !name || !["Number","Boolean","String"].includes(type||"")) return NextResponse.json({ok:false,error:"deviceId, name and valid type are required"},{status:400});
  if(!(await findPersistentDeviceById(deviceId,auth.ownerId,auth.projectId))) return NextResponse.json({ok:false,error:"Device not found"},{status:404});
  try{
    const datastream=await createPersistentDatastream(deviceId,name,type as "Number"|"Boolean"|"String",body?.unit||"",auth.projectId);
    return NextResponse.json({ok:true,projectId:auth.projectId,datastream},{status:201});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Datastream creation failed"},{status:400});
  }
}

export async function DELETE(request: Request) {
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,"Builder");
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const id=new URL(request.url).searchParams.get("id");
  if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  const deleted=await deletePersistentDatastream(id,auth.ownerId,auth.projectId);
  if(!deleted)return NextResponse.json({ok:false,error:"Datastream not found"},{status:404});
  return NextResponse.json({ok:true});
}
