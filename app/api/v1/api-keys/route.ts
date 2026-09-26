import { NextResponse } from "next/server";
import { getSessionUserAsync, sessionCookie } from "@/lib/auth";
import { createProjectApiKey, listProjectApiKeys, revokeProjectApiKey } from "@/lib/project-api-keys";
import { requireWorkspaceRole } from "@/lib/workspace-auth";

function sessionToken(request:Request){return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.slice(sessionCookie.length+1)||undefined;}
async function user(request:Request){return getSessionUserAsync(sessionToken(request));}
const PROJECT="sylvia-local-workspace";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const u=await user(request); if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(u,PROJECT,"Viewer"); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  return NextResponse.json({ok:true,keys:await listProjectApiKeys(u.id),persistent:true});
}
export async function POST(request:Request){
  const u=await user(request); if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(u,PROJECT,"Admin"); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})); const name=String(body.name||"Project key").trim();
  if(name.length<1||name.length>80)return NextResponse.json({ok:false,error:"Key name must be 1-80 characters"},{status:400});
  try{const created=await createProjectApiKey(u.id,name);if(!created)return NextResponse.json({ok:false,error:"Persistent key storage unavailable"},{status:503});return NextResponse.json({ok:true,key:created.key,token:created.token,persistent:true,message:"Copy this token now; the full secret is not shown again."},{status:201});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"API key creation failed"},{status:400});}
}
export async function DELETE(request:Request){
  const u=await user(request); if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(u,PROJECT,"Admin"); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const id=new URL(request.url).searchParams.get("id"); if(!id)return NextResponse.json({ok:false,error:"id is required"},{status:400});
  return NextResponse.json({ok:true,revoked:await revokeProjectApiKey(id,u.id)});
}
