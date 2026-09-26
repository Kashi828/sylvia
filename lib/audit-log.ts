import crypto from "node:crypto";
import { databaseConfigured, query } from "@/lib/db";

export type AuditActorType="session"|"api_key"|"device"|"system"|"unknown";
export type AuditEvent={id:string;ownerId:string|null;projectId:string;actorType:AuditActorType;actorId:string|null;action:string;resourceType:string;resourceId:string|null;metadata:Record<string,unknown>;ipAddress:string|null;userAgent:string|null;createdAt:string};

function map(row:Record<string,unknown>):AuditEvent{return{id:String(row.id),ownerId:row.owner_id?String(row.owner_id):null,projectId:String(row.project_id),actorType:String(row.actor_type) as AuditActorType,actorId:row.actor_id?String(row.actor_id):null,action:String(row.action),resourceType:String(row.resource_type),resourceId:row.resource_id?String(row.resource_id):null,metadata:row.metadata&&typeof row.metadata==="object"?row.metadata as Record<string,unknown>:{},ipAddress:row.ip_address?String(row.ip_address):null,userAgent:row.user_agent?String(row.user_agent):null,createdAt:new Date(String(row.created_at)).toISOString()}}

export function requestIp(request:Request){return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||request.headers.get("x-real-ip")||null}
export function requestUserAgent(request:Request){return request.headers.get("user-agent")||null}

export async function recordAuditEvent(input:{ownerId?:string|null;projectId?:string;actorType:AuditActorType;actorId?:string|null;action:string;resourceType:string;resourceId?:string|null;metadata?:Record<string,unknown>;request?:Request}){
  if(!databaseConfigured())return null;
  try{
    const id=`audit_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const r=await query(`INSERT INTO public.audit_events(id,owner_id,project_id,actor_type,actor_id,action,resource_type,resource_id,metadata,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,owner_id,project_id,actor_type,actor_id,action,resource_type,resource_id,metadata,ip_address,user_agent,created_at`,[id,input.ownerId??null,input.projectId||"sylvia-local-workspace",input.actorType,input.actorId??null,input.action,input.resourceType,input.resourceId??null,input.metadata||{},input.request?requestIp(input.request):null,input.request?requestUserAgent(input.request):null]);
    return map(r.rows[0] as Record<string,unknown>);
  }catch{return null}
}

export async function listAuditEvents(ownerId:string,options:{projectId?:string;action?:string;resourceType?:string;limit?:number}={}){
  if(!databaseConfigured())return [];
  const limit=Math.max(1,Math.min(Number(options.limit||100),500));
  const params:unknown[]=[ownerId];
  const filters=["owner_id=$1"];
  if(options.projectId){params.push(options.projectId);filters.push(`project_id=$${params.length}`);}
  if(options.action){params.push(options.action);filters.push(`action=$${params.length}`);}
  if(options.resourceType){params.push(options.resourceType);filters.push(`resource_type=$${params.length}`);}
  params.push(limit);
  try{const r=await query(`SELECT id,owner_id,project_id,actor_type,actor_id,action,resource_type,resource_id,metadata,ip_address,user_agent,created_at FROM public.audit_events WHERE ${filters.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length}`,params);return r.rows.map(x=>map(x as Record<string,unknown>));}catch{return []}
}
