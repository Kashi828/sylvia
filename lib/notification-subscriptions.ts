import {query,databaseConfigured} from '@/lib/db';
export type SubscriptionKind='all'|'alert'|'delivery';
export type NotificationSubscription={id:string;userId:string;projectId:string;kind:SubscriptionKind;severity:'all'|'info'|'warning'|'critical'|'success'|'error';enabled:boolean;createdAt:string;updatedAt:string};
const g=globalThis as typeof globalThis & {__sylviaSubscriptions?:NotificationSubscription[]};
if(!g.__sylviaSubscriptions) g.__sylviaSubscriptions=[{id:'sub_default',userId:'usr_owner',projectId:'sylvia-local-workspace',kind:'all',severity:'all',enabled:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
const store=g.__sylviaSubscriptions;
export async function listSubscriptions(userId='usr_owner',projectId='sylvia-local-workspace'){
 if(databaseConfigured()){try{const r=await query<any>('SELECT id,user_id,project_id,kind,severity,enabled,created_at,updated_at FROM notification_subscriptions WHERE user_id=$1 AND project_id=$2 ORDER BY created_at ASC',[userId,projectId]);if(r.rows.length)return r.rows.map(row)}catch{}}
 return store.filter(s=>s.userId===userId&&s.projectId===projectId);
}
function map(row:any):NotificationSubscription{return{id:row.id,userId:row.user_id,projectId:row.project_id,kind:row.kind,severity:row.severity,enabled:Boolean(row.enabled),createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()}}
export async function upsertSubscription(input:Partial<NotificationSubscription>&Pick<NotificationSubscription,'userId'|'projectId'>){
 const id=input.id||`sub_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;const now=new Date().toISOString();const next={id,userId:input.userId,projectId:input.projectId,kind:input.kind||'all',severity:input.severity||'all',enabled:input.enabled!==false,createdAt:now,updatedAt:now};
 if(databaseConfigured()){try{const r=await query<any>(`INSERT INTO notification_subscriptions(id,user_id,project_id,kind,severity,enabled) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,severity=EXCLUDED.severity,enabled=EXCLUDED.enabled,updated_at=NOW() RETURNING id,user_id,project_id,kind,severity,enabled,created_at,updated_at`,[id,next.userId,next.projectId,next.kind,next.severity,next.enabled]);return map(r.rows[0])}catch{}}
 const i=store.findIndex(s=>s.id===id);if(i>=0)store[i]={...store[i],...next,createdAt:store[i].createdAt,updatedAt:now};else store.push(next);return store.find(s=>s.id===id)!;
}
export async function deleteSubscription(id:string){if(databaseConfigured()){try{await query('DELETE FROM notification_subscriptions WHERE id=$1',[id]);return true}catch{}}const i=store.findIndex(s=>s.id===id);if(i>=0)store.splice(i,1);return true;}
