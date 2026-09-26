import { NextResponse } from 'next/server';
import { getSessionUserAsync, sessionCookie } from '@/lib/auth';
import { createWorkspaceInvitation, ensureWorkspaceMember, listWorkspaceMembers, removeWorkspaceMember, requireWorkspaceRole, updateWorkspaceMember } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/lib/audit-log';

const PROJECT='sylvia-local-workspace';
function sessionToken(request:Request){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1)||undefined}
async function actor(request:Request){return getSessionUserAsync(sessionToken(request));}

export async function GET(request:Request){
  const user=await actor(request); if(!user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  await ensureWorkspaceMember(user,PROJECT);
  const access=await requireWorkspaceRole(user,PROJECT,'Viewer');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  return NextResponse.json({ok:true,projectId:PROJECT,members:await listWorkspaceMembers(PROJECT)});
}

export async function POST(request:Request){
  const user=await actor(request); if(!user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(user,PROJECT,'Admin');
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {name?:string;email?:string;role?:string};
  const name=String(body.name||'').trim(); const email=String(body.email||'').trim().toLowerCase(); const role=String(body.role||'Viewer') as 'Admin'|'Builder'|'Viewer';
  if(!name||!email)return NextResponse.json({ok:false,error:'name and email are required'},{status:400});
  if(!['Admin','Builder','Viewer'].includes(role))return NextResponse.json({ok:false,error:'Invalid member role'},{status:400});
  try{const member=await createWorkspaceInvitation({projectId:PROJECT,name,email,role}); await recordAuditEvent({ownerId:user.id,actorType:'session',actorId:user.id,action:'workspace.member_invited',resourceType:'workspace_member',resourceId:member.id,metadata:{email,role},request:request}); return NextResponse.json({ok:true,member},{status:201});}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Invitation failed'},{status:400});}
}

export async function PATCH(request:Request){
  const user=await actor(request); if(!user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(user,PROJECT,'Admin'); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await request.json().catch(()=>({})) as {id?:string;name?:string;role?:string;status?:string};
  if(!body.id)return NextResponse.json({ok:false,error:'id is required'},{status:400});
  const role=body.role as 'Admin'|'Builder'|'Viewer'|undefined; const status=body.status as 'Active'|'Invited'|undefined;
  if(role&&!['Admin','Builder','Viewer'].includes(role))return NextResponse.json({ok:false,error:'Invalid member role'},{status:400});
  if(status&&!['Active','Invited'].includes(status))return NextResponse.json({ok:false,error:'Invalid member status'},{status:400});
  try{const member=await updateWorkspaceMember(body.id,PROJECT,{name:body.name,role,status});if(!member)return NextResponse.json({ok:false,error:'Member not found'},{status:404});await recordAuditEvent({ownerId:user.id,actorType:'session',actorId:user.id,action:'workspace.member_updated',resourceType:'workspace_member',resourceId:body.id,metadata:{name:body.name||null,role:role||null,status:status||null},request:request});return NextResponse.json({ok:true,member});}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Member update failed'},{status:400});}
}

export async function DELETE(request:Request){
  const user=await actor(request); if(!user)return NextResponse.json({ok:false,error:'Authentication required'},{status:401});
  const access=await requireWorkspaceRole(user,PROJECT,'Admin'); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const id=new URL(request.url).searchParams.get('id'); if(!id)return NextResponse.json({ok:false,error:'id is required'},{status:400});
  const removed=await removeWorkspaceMember(id,PROJECT);
  await recordAuditEvent({ownerId:user.id,actorType:'session',actorId:user.id,action:'workspace.member_removed',resourceType:'workspace_member',resourceId:id,metadata:{removed},request:request});
  return NextResponse.json({ok:true,removed});
}