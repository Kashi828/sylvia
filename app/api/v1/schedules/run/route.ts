import { NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { runScheduleNow } from "@/lib/automation-engine";

export async function POST(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,"Builder");
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({}));
  const id=String(body?.id||"");
  if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  const result=await runScheduleNow(id,auth.ownerId,auth.projectId);
  return result?NextResponse.json({ok:true,projectId:auth.projectId,result}):NextResponse.json({ok:false,error:"Schedule not found"},{status:404});
}
