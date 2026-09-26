import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { createAutomationRule, deleteAutomationRule, listAutomationRules, updateAutomationRule } from "@/lib/automation-engine";

function sessionUser(request: Request) { const token=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.split("=")[1]; return getSessionUser(token); }
const operators=[">",">=","<","<=","=","!="];
const actions=["device_command","event"];

export const dynamic="force-dynamic";

export async function GET(request: Request) { const user=sessionUser(request); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); return NextResponse.json({ok:true,automations:await listAutomationRules(user.id),persistent:true}); }
export async function POST(request: Request) {
  const user=sessionUser(request); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
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
  try { const rule=await createAutomationRule({ownerId:user.id,projectId:typeof body?.projectId==="string"?body.projectId:undefined,name,deviceId,streamId,operator,threshold,action,command:command||null,payload:body?.payload??{},cooldownSeconds:Number(body?.cooldownSeconds??300),enabled:body?.enabled!==false}); return NextResponse.json({ok:true,automation:rule,persistent:true},{status:201}); }
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Automation creation failed"},{status:400});}
}
export async function PATCH(request: Request) {
  const user=sessionUser(request); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null; const id=typeof body?.id==="string"?body.id:"";
  if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  const patch={...body}; delete patch.id; delete patch.ownerId; delete patch.deviceId; delete patch.streamId; delete patch.projectId;
  const rule=await updateAutomationRule(id,user.id,patch as never); if(!rule)return NextResponse.json({ok:false,error:"Automation not found or unchanged"},{status:404});
  return NextResponse.json({ok:true,automation:rule});
}
export async function DELETE(request: Request) { const user=sessionUser(request); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401}); const id=new URL(request.url).searchParams.get("id"); if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400}); return NextResponse.json({ok:true,deleted:await deleteAutomationRule(id,user.id)}); }