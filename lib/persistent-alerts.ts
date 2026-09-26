import { databaseConfigured, query } from "@/lib/db";
import { recordDeviceEvent } from "@/lib/device-events";

export type PersistentAlertOperator = ">"|">="|"<"|"<="|"="|"!=";
export type PersistentAlertSeverity = "info"|"warning"|"critical";
export type PersistentAlertAction = "none"|"webhook";
export type PersistentAlertRule={id:string;ownerId:string;projectId:string;name:string;deviceId:string;streamId:string;operator:PersistentAlertOperator;threshold:number;severity:PersistentAlertSeverity;cooldownSeconds:number;enabled:boolean;action:PersistentAlertAction;webhookUrl:string;lastTriggeredAt:string|null;active:boolean;createdAt:string;updatedAt:string};
export type PersistentAlertEvent={id:string;ownerId:string;projectId:string;ruleId:string;ruleName:string;deviceId:string;streamId:string;value:number;threshold:number;operator:PersistentAlertOperator;severity:PersistentAlertSeverity;message:string;timestamp:string;acknowledged:boolean};
export type PersistentAlertDelivery={id:string;ownerId:string;projectId:string;eventId:string;ruleId:string;url:string;status:"sent"|"failed";statusCode:number|null;error:string|null;timestamp:string};

function rule(row:Record<string,unknown>):PersistentAlertRule{
 return {id:String(row.id),ownerId:String(row.owner_id),projectId:String(row.project_id),name:String(row.name),deviceId:String(row.device_id),streamId:String(row.stream_id),operator:row.operator as PersistentAlertOperator,threshold:Number(row.threshold),severity:row.severity as PersistentAlertSeverity,cooldownSeconds:Number(row.cooldown_seconds),enabled:Boolean(row.enabled),action:row.action as PersistentAlertAction,webhookUrl:String(row.webhook_url||""),lastTriggeredAt:row.last_triggered_at?new Date(String(row.last_triggered_at)).toISOString():null,active:Boolean(row.active),createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString()};
}
function event(row:Record<string,unknown>):PersistentAlertEvent{
 return {id:String(row.id),ownerId:String(row.owner_id),projectId:String(row.project_id),ruleId:String(row.rule_id),ruleName:String(row.rule_name),deviceId:String(row.device_id),streamId:String(row.stream_id),value:Number(row.value),threshold:Number(row.threshold),operator:row.operator as PersistentAlertOperator,severity:row.severity as PersistentAlertSeverity,message:String(row.message),timestamp:new Date(String(row.timestamp)).toISOString(),acknowledged:Boolean(row.acknowledged)};
}
function delivery(row:Record<string,unknown>):PersistentAlertDelivery{
 return {id:String(row.id),ownerId:String(row.owner_id),projectId:String(row.project_id),eventId:String(row.event_id),ruleId:String(row.rule_id),url:String(row.url),status:row.status as "sent"|"failed",statusCode:row.status_code===null?null:Number(row.status_code),error:row.error?String(row.error):null,timestamp:new Date(String(row.timestamp)).toISOString()};
}
function compare(v:number,op:PersistentAlertOperator,t:number){return op===">"?v>t:op===">="?v>=t:op==="<"?v<t:op==="<="?v<=t:op==="="?v===t:v!==t;}

export async function listPersistentAlertRules(ownerId:string){
 if(!databaseConfigured())return [];
 try{const r=await query("SELECT id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at FROM public.alert_rules WHERE owner_id=$1 ORDER BY name ASC",[ownerId]);return r.rows.map(x=>rule(x as Record<string,unknown>));}catch{return [];}}
export async function createPersistentAlertRule(input:{ownerId:string;projectId?:string;name:string;deviceId:string;streamId:string;operator:PersistentAlertOperator;threshold:number;severity:PersistentAlertSeverity;cooldownSeconds?:number;enabled?:boolean;action?:PersistentAlertAction;webhookUrl?:string}){
 if(!databaseConfigured())return null;
 const owned=await query("SELECT 1 FROM public.device_registry WHERE device_id=$1 AND owner_id=$2 LIMIT 1",[input.deviceId,input.ownerId]);
 if(!owned.rows[0])throw new Error("Device not found in this workspace");
 const stream=await query("SELECT 1 FROM public.datastream_registry WHERE datastream_id=$1 AND device_id=$2 LIMIT 1",[input.streamId,input.deviceId]);
 if(!stream.rows[0])throw new Error("Datastream does not belong to the selected device");
 const id="alert_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
 const r=await query("INSERT INTO public.alert_rules (id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at",[id,input.ownerId,input.projectId||"sylvia-local-workspace",input.name.trim(),input.deviceId,input.streamId,input.operator,input.threshold,input.severity,Math.max(0,Math.min(Math.trunc(input.cooldownSeconds??300),86400)),input.enabled!==false,input.action||"none",String(input.webhookUrl||"")]);
 return rule(r.rows[0] as Record<string,unknown>);
}
export async function updatePersistentAlertRule(id:string,ownerId:string,patch:Record<string,unknown>){
 if(!databaseConfigured())return null;
 const map:Record<string,string>={name:"name",operator:"operator",threshold:"threshold",severity:"severity",cooldownSeconds:"cooldown_seconds",enabled:"enabled",action:"action",webhookUrl:"webhook_url"};
 const entries=Object.entries(patch).filter(([k,v])=>map[k]&&v!==undefined);
 if(!entries.length)return null;
 const values:unknown[]=[id,ownerId]; const sets:string[]=[];
 for(const [k,v] of entries){let value=v;if(k==="cooldownSeconds")value=Math.max(0,Math.min(Math.trunc(Number(v)),86400));values.push(value);sets.push(map[k]+"=$"+values.length);}
 values.push(new Date().toISOString());
 const r=await query("UPDATE public.alert_rules SET "+sets.join(",")+",updated_at=$"+values.length+" WHERE id=$1 AND owner_id=$2 RETURNING id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at",values);
 return r.rows[0]?rule(r.rows[0] as Record<string,unknown>):null;
}
export async function deletePersistentAlertRule(id:string,ownerId:string){if(!databaseConfigured())return false;const r=await query("DELETE FROM public.alert_rules WHERE id=$1 AND owner_id=$2",[id,ownerId]);return r.rowCount===1;}

async function saveDelivery(input:{ownerId:string;projectId:string;eventId:string;ruleId:string;url:string;status:"sent"|"failed";statusCode?:number|null;error?:string|null}){
 const id="delivery_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);
 try{const r=await query("INSERT INTO public.alert_deliveries (id,owner_id,project_id,event_id,rule_id,url,status,status_code,error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,owner_id,project_id,event_id,rule_id,url,status,status_code,error,timestamp",[id,input.ownerId,input.projectId,input.eventId,input.ruleId,input.url,input.status,input.statusCode??null,input.error??null]);return delivery(r.rows[0] as Record<string,unknown>);}catch{return null;}
}
async function sendWebhook(rule:PersistentAlertRule,evt:PersistentAlertEvent){
 if(rule.action!=="webhook"||!rule.webhookUrl)return null;
 let url:URL; try{url=new URL(rule.webhookUrl);if(!["http:","https:"].includes(url.protocol))throw new Error("Webhook URL must use HTTP or HTTPS");}catch(error){return saveDelivery({ownerId:rule.ownerId,projectId:rule.projectId,eventId:evt.id,ruleId:rule.id,url:rule.webhookUrl,status:"failed",error:error instanceof Error?error.message:"Invalid URL"});}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json","x-sylvia-event":"telemetry.alert"},body:JSON.stringify({type:"telemetry.alert",event:evt,rule:{id:rule.id,name:rule.name,severity:rule.severity}}),signal:controller.signal});return saveDelivery({ownerId:rule.ownerId,projectId:rule.projectId,eventId:evt.id,ruleId:rule.id,url:rule.webhookUrl,status:response.ok?"sent":"failed",statusCode:response.status,error:response.ok?null:"HTTP "+response.status});}catch(error){return saveDelivery({ownerId:rule.ownerId,projectId:rule.projectId,eventId:evt.id,ruleId:rule.id,url:rule.webhookUrl,status:"failed",error:error instanceof Error?error.message:"Webhook delivery failed"});}finally{clearTimeout(timer);}
}

export async function evaluatePersistentAlerts(deviceId:string,streamId:string,value:number){
 if(!databaseConfigured()||!Number.isFinite(value))return [];
 const d=await query("SELECT owner_id FROM public.device_registry WHERE device_id=$1 LIMIT 1",[deviceId]);
 const ownerId=d.rows[0]?.owner_id?String(d.rows[0].owner_id):""; if(!ownerId)return [];
 const r=await query("SELECT id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at FROM public.alert_rules WHERE owner_id=$1 AND device_id=$2 AND stream_id=$3 AND enabled=true",[ownerId,deviceId,streamId]);
 const out:PersistentAlertEvent[]=[];
 for(const row of r.rows){
   const candidate=rule(row as Record<string,unknown>); const matched=compare(value,candidate.operator,candidate.threshold);
   await query("UPDATE public.alert_rules SET active=$4,updated_at=now() WHERE id=$1 AND owner_id=$2 AND device_id=$3",[candidate.id,ownerId,deviceId,matched]);
   if(!matched)continue;
   const claim=await query("UPDATE public.alert_rules SET last_triggered_at=now(),updated_at=now() WHERE id=$1 AND owner_id=$2 AND enabled=true AND (last_triggered_at IS NULL OR last_triggered_at <= now() - ($3::text || ' seconds')::interval) RETURNING id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at",[candidate.id,ownerId,candidate.cooldownSeconds]);
   if(!claim.rows[0])continue;
   const claimed=rule(claim.rows[0] as Record<string,unknown>); const id="event_"+Date.now()+"_"+Math.random().toString(36).slice(2,8); const msg=streamId+" is "+value+" "+claimed.operator+" "+claimed.threshold;
   const e=await query("INSERT INTO public.alert_events (id,owner_id,project_id,rule_id,rule_name,device_id,stream_id,value,threshold,operator,severity,message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,owner_id,project_id,rule_id,rule_name,device_id,stream_id,value,threshold,operator,severity,message,timestamp,acknowledged",[id,ownerId,claimed.projectId,claimed.id,claimed.name,deviceId,streamId,value,claimed.threshold,claimed.operator,claimed.severity,msg]);
   const evt=event(e.rows[0] as Record<string,unknown>); out.push(evt); void sendWebhook(claimed,evt);
   await recordDeviceEvent({deviceId,ownerId,kind:"alert.triggered",severity:claimed.severity,message:claimed.name,data:{value,threshold:claimed.threshold,operator:claimed.operator,eventId:evt.id}});
 }
 return out;
}
export async function listPersistentAlertEvents(ownerId:string,opts?:{activeOnly?:boolean;limit?:number}){if(!databaseConfigured())return [];const limit=Math.max(1,Math.min(Math.trunc(opts?.limit??200),200));const where=opts?.activeOnly?" AND acknowledged=false":"";try{const r=await query("SELECT id,owner_id,project_id,rule_id,rule_name,device_id,stream_id,value,threshold,operator,severity,message,timestamp,acknowledged FROM public.alert_events WHERE owner_id=$1"+where+" ORDER BY timestamp DESC LIMIT $2",[ownerId,limit]);return r.rows.map(x=>event(x as Record<string,unknown>));}catch{return [];}}
export async function acknowledgePersistentAlertEvent(id:string,ownerId:string){if(!databaseConfigured())return null;const r=await query("UPDATE public.alert_events SET acknowledged=true WHERE id=$1 AND owner_id=$2 RETURNING id,owner_id,project_id,rule_id,rule_name,device_id,stream_id,value,threshold,operator,severity,message,timestamp,acknowledged",[id,ownerId]);if(!r.rows[0])return null;await query("UPDATE public.alert_rules SET active=false,updated_at=now() WHERE id=$1 AND owner_id=$2",[String(r.rows[0].rule_id),ownerId]);return event(r.rows[0] as Record<string,unknown>);}
export async function listPersistentAlertDeliveries(ownerId:string,limit=100){if(!databaseConfigured())return [];const safe=Math.max(1,Math.min(Math.trunc(limit),200));try{const r=await query("SELECT id,owner_id,project_id,event_id,rule_id,url,status,status_code,error,timestamp FROM public.alert_deliveries WHERE owner_id=$1 ORDER BY timestamp DESC LIMIT $2",[ownerId,safe]);return r.rows.map(x=>delivery(x as Record<string,unknown>));}catch{return [];}}
export async function testPersistentAlertWebhook(id:string,ownerId:string){if(!databaseConfigured())return null;const r=await query("SELECT id,owner_id,project_id,name,device_id,stream_id,operator,threshold,severity,cooldown_seconds,enabled,action,webhook_url,last_triggered_at,active,created_at,updated_at FROM public.alert_rules WHERE id=$1 AND owner_id=$2 LIMIT 1",[id,ownerId]);if(!r.rows[0])return null;const rr=rule(r.rows[0] as Record<string,unknown>);const testId="test_"+Date.now();const evt:PersistentAlertEvent={id:testId,ownerId,projectId:rr.projectId,ruleId:rr.id,ruleName:rr.name,deviceId:rr.deviceId,streamId:rr.streamId,value:rr.threshold,threshold:rr.threshold,operator:rr.operator,severity:rr.severity,message:"Test alert for "+rr.name,timestamp:new Date().toISOString(),acknowledged:false};await query("INSERT INTO public.alert_events (id,owner_id,project_id,rule_id,rule_name,device_id,stream_id,value,threshold,operator,severity,message,timestamp,acknowledged) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false)",[testId,ownerId,rr.projectId,rr.id,rr.name,rr.deviceId,rr.streamId,rr.threshold,rr.threshold,rr.operator,rr.severity,evt.message,evt.timestamp]);return {event:evt,delivery:await sendWebhook(rr,evt)};}