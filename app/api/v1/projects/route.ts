import { NextResponse } from "next/server";
import { getSessionUserAsync, sessionCookie } from "@/lib/auth";
import { requireWorkspaceRole } from "@/lib/workspace-auth";
import { createWorkspaceProject, ensureDefaultWorkspaceProject, listWorkspaceProjects } from "@/lib/workspace-projects";

function sessionToken(request:Request){
  return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.slice(sessionCookie.length+1)||undefined;
}
async function user(request:Request){return getSessionUserAsync(sessionToken(request));}

export async function GET(request:Request){
  const u=await user(request);
  if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  await ensureDefaultWorkspaceProject(u);
  return NextResponse.json({ok:true,projects:await listWorkspaceProjects(u.id)});
}

export async function POST(request:Request){
  const u=await user(request);
  if(!u)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(u,"sylvia-local-workspace","Admin");
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {name?:string};
  const name=String(body.name||"").trim();
  if(!name)return NextResponse.json({ok:false,error:"name is required"},{status:400});
  try{
    const project=await createWorkspaceProject(u,name);
    if(!project)return NextResponse.json({ok:false,error:"Persistent project storage unavailable"},{status:503});
    return NextResponse.json({ok:true,project},{status:201});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Project creation failed"},{status:400});
  }
}
