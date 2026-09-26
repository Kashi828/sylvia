
import { NextRequest,NextResponse } from "next/server";
import { requestOwnerId } from "@/lib/request-auth";
import { createPersistentAlertRule, deletePersistentAlertRule, listPersistentAlertRules, updatePersistentAlertRule } from "@/lib/persistent-alerts";
import { listAlertRules as listMemoryRules, createAlertRule as createMemoryRule, deleteAlertRule as deleteMemoryRule, updateAlertRule as updateMemoryRule } from "@/lib/alerts";

export async function GET(req:NextRequest){
  const auth=await requestOwnerId(req);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  if(!process.env.POSTGRES_URL)return NextResponse.json({ok:true,rules:listMemoryRules(),persistent:false});
  return NextResponse.json({ok:true,rules:await listPersistentAlertRules(auth.ownerId),persistent:true});
}
export async function POST(req:NextRequest){
  const auth=await requestOwnerId(req);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const b=await req.json().catch(()=>null);
  if(!b?.name||!b?.deviceId||!b?.streamId||typeof b.threshold!=="number")return NextResponse.json({ok:false,error:"name, deviceId, streamId and numeric threshold are required"},{status:400});
  try{
    if(!process.env.POSTGRES_URL){
      const rule=createMemoryRule({name:String(b.name),deviceId:String(b.deviceId),streamId:String(b.streamId),operator:b.operator||">",threshold:b.threshold,severity:b.severity||"warning",cooldownSeconds:Math.max(0,Number(b.cooldownSeconds??300)),enabled:b.enabled!==false,action:b.action||"none",webhookUrl:String(b.webhookUrl||"")});
      return NextResponse.json({ok:true,rule,persistent:false},{status:201});
    }
    const rule=await createPersistentAlertRule({ownerId:auth.ownerId,projectId:typeof b.projectId==="string"?b.projectId:undefined,name:String(b.name),deviceId:String(b.deviceId),streamId:String(b.streamId),operator:b.operator||">",threshold:Number(b.threshold),severity:b.severity||"warning",cooldownSeconds:Number(b.cooldownSeconds??300),enabled:b.enabled!==false,action:b.action||"none",webhookUrl:String(b.webhookUrl||"")});
    return NextResponse.json({ok:true,rule,persistent:true},{status:201});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Alert creation failed"},{status:400});}
}
export async function PATCH(req:NextRequest){
  const auth=await requestOwnerId(req);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const b=await req.json().catch(()=>null);const id=String(b?.id||"");
  if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  const patch={...b};delete patch.id;delete patch.ownerId;
  if(!process.env.POSTGRES_URL){const rule=updateMemoryRule(id,patch);return rule?NextResponse.json({ok:true,rule,persistent:false}):NextResponse.json({ok:false,error:"Rule not found"},{status:404});}
  const rule=await updatePersistentAlertRule(id,auth.ownerId,patch);return rule?NextResponse.json({ok:true,rule,persistent:true}):NextResponse.json({ok:false,error:"Rule not found or unchanged"},{status:404});
}
export async function DELETE(req:NextRequest){
  const auth=await requestOwnerId(req);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const id=req.nextUrl.searchParams.get("id");if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  if(!process.env.POSTGRES_URL)return NextResponse.json({ok:deleteMemoryRule(id),persistent:false});
  return NextResponse.json({ok:await deletePersistentAlertRule(id,auth.ownerId),persistent:true});
}