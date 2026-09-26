import { NextResponse } from "next/server";
import { requestPrincipal } from "@/lib/request-auth";
import { createWorkspaceProject, ensureDefaultWorkspaceProject, listWorkspaceProjects } from "@/lib/workspace-projects";
import { requireWorkspaceRole } from "@/lib/workspace-auth";

export async function GET(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  await ensureDefaultWorkspaceProject(auth.user);
  return NextResponse.json({ok:true,projects:await listWorkspaceProjects(auth.user.id)});
}

export async function POST(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,"Admin");
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {name?:string};
  const name=String(body.name||"").trim();
  if(!name)return NextResponse.json({ok:false,error:"name is required"},{status:400});
  try{
    const project=await createWorkspaceProject(auth.user,name);
    if(!project)return NextResponse.json({ok:false,error:"Persistent project storage unavailable"},{status:503});
    return NextResponse.json({ok:true,project},{status:201});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Project creation failed"},{status:400});
  }
}
