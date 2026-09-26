import crypto from "node:crypto";
import { databaseConfigured, query } from "@/lib/db";

const prefix="syl_sk_";
function pepper(){
  const apiSecret=process.env.SYLVIA_API_KEY_SECRET;
  if(apiSecret)return apiSecret;
  if(process.env.NODE_ENV==="production")throw new Error("SYLVIA_API_KEY_SECRET must be configured in production");
  return process.env.SYLVIA_DEVICE_TOKEN_SECRET||"sylvia-beta-api-secret-change-me";
}
function hash(token:string){return crypto.createHmac("sha256",pepper()).update(token).digest("hex");}
function generate(){return prefix+crypto.randomBytes(24).toString("base64url");}
function preview(token:string){return token.slice(0,12)+"…"+token.slice(-5);}

export type ProjectApiKey={id:string;ownerId:string;projectId:string;name:string;tokenPreview:string;revoked:boolean;createdAt:string;lastUsedAt:string|null};
function normalize(row:Record<string,unknown>):ProjectApiKey{return{id:String(row.id),ownerId:String(row.owner_id),projectId:String(row.project_id),name:String(row.name),tokenPreview:String(row.token_preview),revoked:Boolean(row.revoked),createdAt:new Date(String(row.created_at)).toISOString(),lastUsedAt:row.last_used_at?new Date(String(row.last_used_at)).toISOString():null};}

export async function createProjectApiKey(ownerId:string,projectId:string,name:string){
 if(!databaseConfigured())return null;
 const token=generate(); const id="key_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
 const r=await query(`INSERT INTO public.project_api_keys (id,owner_id,project_id,name,token_hash,token_preview) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,owner_id,project_id,name,token_preview,revoked,created_at,last_used_at`,[id,ownerId,projectId,name.trim()||"Project key",hash(token),preview(token)]);
 return {key:normalize(r.rows[0] as Record<string,unknown>),token};
}
export async function listProjectApiKeys(ownerId:string,projectId:string){if(!databaseConfigured())return[];try{const r=await query(`SELECT id,owner_id,project_id,name,token_preview,revoked,created_at,last_used_at FROM public.project_api_keys WHERE owner_id=$1 AND project_id=$2 ORDER BY created_at DESC`,[ownerId,projectId]);return r.rows.map(x=>normalize(x as Record<string,unknown>));}catch{return[];}}
export async function revokeProjectApiKey(id:string,ownerId:string,projectId:string){if(!databaseConfigured())return false;const r=await query(`UPDATE public.project_api_keys SET revoked=true WHERE id=$1 AND owner_id=$2 AND project_id=$3 AND revoked=false`,[id,ownerId,projectId]);return r.rowCount===1;}
export async function authenticateProjectApiKey(token:string){
 if(!databaseConfigured()||!token||!token.startsWith(prefix))return null;
 const r=await query(`SELECT id,owner_id,project_id,name,token_preview,revoked,created_at,last_used_at FROM public.project_api_keys WHERE token_hash=$1 AND revoked=false LIMIT 1`,[hash(token)]);
 if(!r.rows[0])return null;
 const row=r.rows[0] as Record<string,unknown>;
 void query(`UPDATE public.project_api_keys SET last_used_at=now() WHERE id=$1`,[String(row.id)]).catch(()=>undefined);
 return normalize(row);
}
export function extractApiKey(request:Request){return request.headers.get("x-sylvia-api-key")?.trim()||request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim()||"";}
