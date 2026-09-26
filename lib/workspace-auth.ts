import { databaseConfigured, query } from '@/lib/db';
import type { User } from '@/lib/auth';

export type WorkspaceRole=User['role'];
export type WorkspaceMember={id:string;projectId:string;userId:string|null;name:string;email:string;role:WorkspaceRole;status:'Active'|'Invited';createdAt:string;updatedAt:string};

function map(row:Record<string,unknown>):WorkspaceMember{return{id:String(row.id),projectId:String(row.project_id),userId:row.user_id?String(row.user_id):null,name:String(row.name),email:String(row.email),role:String(row.role) as WorkspaceRole,status:String(row.status) as WorkspaceMember['status'],createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString()}}

export async function ensureWorkspaceMember(user:User,projectId='sylvia-local-workspace'){
  if(!databaseConfigured())return {id:`member_${user.id}`,projectId,userId:user.id,name:user.name,email:user.email,role:user.role,status:'Active',createdAt:user.createdAt,updatedAt:user.createdAt} as WorkspaceMember;
  const r=await query(`INSERT INTO public.workspace_members (id,project_id,user_id,name,email,role,status) VALUES ($1,$2,$3,$4,$5,$6,'Active') ON CONFLICT (project_id,email) DO UPDATE SET user_id=EXCLUDED.user_id,name=EXCLUDED.name,role=EXCLUDED.role,status='Active',updated_at=NOW() RETURNING id,project_id,user_id,name,email,role,status,created_at,updated_at`,[`member_${user.id}`,projectId,user.id,user.name,user.email,user.role]);
  return map(r.rows[0] as Record<string,unknown>);
}

export async function getWorkspaceMember(userId:string,projectId='sylvia-local-workspace'){
  if(!databaseConfigured())return null;
  const r=await query(`SELECT id,project_id,user_id,name,email,role,status,created_at,updated_at FROM public.workspace_members WHERE project_id=$1 AND user_id=$2 AND status='Active' LIMIT 1`,[projectId,userId]);
  return r.rows[0]?map(r.rows[0] as Record<string,unknown>):null;
}

export function roleCan(role:WorkspaceRole,required:WorkspaceRole){
  const weight:Record<WorkspaceRole,number>={Viewer:10,Builder:20,Admin:30,Owner:40};
  return weight[role]>=weight[required];
}

export async function requireWorkspaceRole(user:User,projectId:string,required:WorkspaceRole){
  const member=await getWorkspaceMember(user.id,projectId);
  const effective=member?.role||user.role;
  if(!roleCan(effective,required))return {ok:false as const,status:403 as const,error:`Requires ${required} access`,member};
  return {ok:true as const,member};
}

export async function listWorkspaceMembers(projectId='sylvia-local-workspace'){
  if(!databaseConfigured())return [];
  const r=await query(`SELECT id,project_id,user_id,name,email,role,status,created_at,updated_at FROM public.workspace_members WHERE project_id=$1 ORDER BY CASE role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 WHEN 'Builder' THEN 2 ELSE 3 END, created_at ASC`,[projectId]);
  return r.rows.map(row=>map(row as Record<string,unknown>));
}

export async function createWorkspaceInvitation(input:{projectId?:string;name:string;email:string;role:WorkspaceRole}){
  if(!databaseConfigured())throw new Error('Persistent workspace storage is unavailable');
  const projectId=input.projectId||'sylvia-local-workspace';
  const id=`member_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const r=await query(`INSERT INTO public.workspace_members (id,project_id,user_id,name,email,role,status) VALUES ($1,$2,NULL,$3,$4,$5,'Invited') ON CONFLICT (project_id,email) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,status='Invited',updated_at=NOW() RETURNING id,project_id,user_id,name,email,role,status,created_at,updated_at`,[id,projectId,input.name.trim()||'Pending member',input.email.trim().toLowerCase(),input.role]);
  return map(r.rows[0] as Record<string,unknown>);
}

export async function updateWorkspaceMember(id:string,projectId:string,patch:Partial<Pick<WorkspaceMember,'name'|'role'|'status'>>){
  if(!databaseConfigured())throw new Error('Persistent workspace storage is unavailable');
  if(patch.role==='Owner')throw new Error('Owner role cannot be assigned through member management');
  const r=await query(`UPDATE public.workspace_members SET name=COALESCE($3,name),role=COALESCE($4,role),status=COALESCE($5,status),updated_at=NOW() WHERE id=$1 AND project_id=$2 AND role<>'Owner' RETURNING id,project_id,user_id,name,email,role,status,created_at,updated_at`,[id,projectId,patch.name?.trim()||null,patch.role||null,patch.status||null]);
  return r.rows[0]?map(r.rows[0] as Record<string,unknown>):null;
}

export async function removeWorkspaceMember(id:string,projectId:string){
  if(!databaseConfigured())throw new Error('Persistent workspace storage is unavailable');
  const r=await query(`DELETE FROM public.workspace_members WHERE id=$1 AND project_id=$2 AND role<>'Owner'`,[id,projectId]);
  return r.rowCount===1;
}
