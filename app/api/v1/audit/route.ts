import { NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { listAuditEvents } from "@/lib/audit-log";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  if(auth.method!=="session")return NextResponse.json({ok:false,error:"Admin session required for audit history"},{status:403});
  const access=await requireWorkspaceRole(auth.user!,auth.projectId,"Admin");if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const url=new URL(request.url);
  const limit=Math.max(1,Math.min(Number(url.searchParams.get("limit")||100),500));
  const events=await listAuditEvents(auth.ownerId,{projectId:auth.projectId,action:url.searchParams.get("action")||undefined,resourceType:url.searchParams.get("resourceType")||undefined,limit});
  return NextResponse.json({ok:true,projectId:auth.projectId,count:events.length,events},{headers:{"Cache-Control":"no-store"}});
}
