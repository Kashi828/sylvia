import { NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { createAutomationRule, deleteAutomationRule, listAutomationRules, updateAutomationRule } from "@/lib/automation-engine";

const operators=[">",">=","<","<=","=","!="];
const actions=["device_command","event"];

export const dynamic="force-dynamic";

export async function GET(request: Request) { const auth=await requestPrincipal(request); if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); return NextResponse.json({ok:true,automations:await listAutomationRules(auth.ownerId,auth.projectId),persistent:true}); }
export async function POST(request: Request) {
  const auth=await requestPrincipal(request); if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); if(auth.method==="session"){const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Builder");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});}
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const name=typeof body?.name==="string"?body.name.trim():"";
  const deviceId=typeof body?.deviceId==="string"?body.deviceId.trim():String(body?.deviceId??"");
  const streamId=typeof body?.streamId==="string"?body.streamId.trim():String(body?.streamId??"");
  const operator=body?.operator as typeof operators[number];
  const threshold=Number(body?.threshold);
  const action=body?.action as typeof actions[number];
  const command=typeof body?.command==="string"?body.command.trim():"";
  if(!name||!deviceId||!streamId||!operators.includes(operator)||!Number.isFinite(threshold)||!actions.includes(action))return NextResponse.json({ok:false,error:"name, deviceId, streamId, valid operator, threshold and action are required"},{status:400});
  if(action==="device_command"&&!command)return NextResponse.json({ok:false,error:"command is required for device_command actions"},{status:400});
  try { const rule=await createAutomationRule({ownerId:auth.ownerId,projectId:auth.projectId,name,deviceId,streamId,operator,threshold,action,command:command||null,payload:body?.payload??{},cooldownSeconds:Number(body?.cooldownSeconds??300),enabled:body?.enabled!==false}); return NextResponse.json({ok:true,automation:rule,persistent:true},{status:201}); }
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Automation creation failed"},{status:400});}
}
export async function PATCH(request: Request) {
  const auth=await requestPrincipal(request); if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); if(auth.method==="session"){const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Builder");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});}
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null; const id=typeof body?.id==="string"?body.id:"";
  if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  const patch={...body}; delete patch.id; delete patch.ownerId; delete patch.deviceId; delete patch.streamId; delete patch.projectId;
  const rule=await updateAutomationRule(id,auth.ownerId,auth.projectId,patch as never); if(!rule)return NextResponse.json({ok:false,error:"Automation not found or unchanged"},{status:404});
  return NextResponse.json({ok:true,automation:rule});
}
export async function DELETE(request: Request) { const auth=await requestPrincipal(request); if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); if(auth.method==="session"){const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Builder");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});} const id=new URL(request.url).searchParams.get("id"); if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400}); return NextResponse.json({ok:true,deleted:await deleteAutomationRule(id,auth.ownerId,auth.projectId)}); }