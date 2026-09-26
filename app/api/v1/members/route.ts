import { NextResponse } from 'next/server';
import { requestPrincipal } from '@/lib/request-auth';
import { createWorkspaceInvitation, listWorkspaceMembers, removeWorkspaceMember, requireWorkspaceRole, updateWorkspaceMember } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/lib/audit-log';

export async function GET(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Viewer');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  return NextResponse.json({ok:true,projectId:auth.projectId,members:await listWorkspaceMembers(auth.projectId)});
}

export async function POST(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Admin');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {name?:string;email?:string;role?:string};
  const name=String(body.name||'').trim(); const email=String(body.email||'').trim().toLowerCase(); const role=String(body.role||'Viewer') as 'Admin'|'Builder'|'Viewer';
  if(!name||!email)return NextResponse.json({ok:false,error:'name and email are required'},{status:400});
  if(!['Admin','Builder','Viewer'].includes(role))return NextResponse.json({ok:false,error:'Invalid member role'},{status:400});
  try{
    const member=await createWorkspaceInvitation({projectId:auth.projectId,name,email,role});
    await recordAuditEvent({ownerId:auth.ownerId,projectId:auth.projectId,actorType:'session',actorId:auth.user.id,action:'workspace.member_invited',resourceType:'workspace_member',resourceId:member.id,metadata:{email,role},request});
    return NextResponse.json({ok:true,projectId:auth.projectId,member},{status:201});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Invitation failed'},{status:400});}
}

export async function PATCH(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Admin'); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {id?:string;name?:string;role?:string;status?:string};
  if(!body.id)return NextResponse.json({ok:false,error:'id is required'},{status:400});
  const role=body.role as 'Admin'|'Builder'|'Viewer'|undefined; const status=body.status as 'Active'|'Invited'|undefined;
  if(role&&!['Admin','Builder','Viewer'].includes(role))return NextResponse.json({ok:false,error:'Invalid member role'},{status:400});
  if(status&&!['Active','Invited'].includes(status))return NextResponse.json({ok:false,error:'Invalid member status'},{status:400});
  try{
    const member=await updateWorkspaceMember(body.id,auth.projectId,{name:body.name,role,status});
    if(!member)return NextResponse.json({ok:false,error:'Member not found'},{status:404});
    await recordAuditEvent({ownerId:auth.ownerId,projectId:auth.projectId,actorType:'session',actorId:auth.user.id,action:'workspace.member_updated',resourceType:'workspace_member',resourceId:body.id,metadata:{name:body.name||null,role:role||null,status:status||null},request});
    return NextResponse.json({ok:true,projectId:auth.projectId,member});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Member update failed'},{status:400});}
}

export async function DELETE(request:Request){
  const auth=await requestPrincipal(request);
  if(!auth || auth.method!=="session" || !auth.user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(auth.user,auth.projectId,'Admin'); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const id=new URL(request.url).searchParams.get('id'); if(!id)return NextResponse.json({ok:false,error:'id is required'},{status:400});
  const removed=await removeWorkspaceMember(id,auth.projectId);
  await recordAuditEvent({ownerId:auth.ownerId,projectId:auth.projectId,actorType:'session',actorId:auth.user.id,action:'workspace.member_removed',resourceType:'workspace_member',resourceId:id,metadata:{removed},request});
  return NextResponse.json({ok:true,projectId:auth.projectId,removed});
}
