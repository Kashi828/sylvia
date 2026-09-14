export type AlertOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertAction = 'none' | 'webhook';
export type AlertRule = {
  id: string; name: string; deviceId: string; streamId: string;
  operator: AlertOperator; threshold: number; severity: AlertSeverity;
  cooldownSeconds: number; enabled: boolean; action: AlertAction; webhookUrl: string; createdAt: string;
  lastTriggeredAt: string | null; active: boolean;
};
export type AlertEvent = {
  id: string; ruleId: string; ruleName: string; deviceId: string; streamId: string;
  value: number; threshold: number; operator: AlertOperator; severity: AlertSeverity;
  message: string; timestamp: string; acknowledged: boolean;
};

const rules = new Map<string, AlertRule>();
const events: AlertEvent[] = [];
export type AlertDelivery = { id:string; eventId:string; ruleId:string; url:string; status:'sent'|'failed'; statusCode:number|null; error:string|null; timestamp:string };
const deliveries: AlertDelivery[] = [];
let seeded = false;
function seed() {
  if (seeded) return; seeded = true;
  const now = new Date().toISOString();
  rules.set('temperature-high-demo', { id:'temperature-high-demo', name:'High temperature', deviceId:'demo-device', streamId:'temperature', operator:'>', threshold:35, severity:'warning', cooldownSeconds:300, enabled:true, action:'none', webhookUrl:'', createdAt:now, lastTriggeredAt:null, active:false });
}
function compare(value:number, op:AlertOperator, threshold:number) {
  return op==='>'?value>threshold:op==='>='?value>=threshold:op==='<'?value<threshold:op==='<='?value<=threshold:op==='='?value===threshold:value!==threshold;
}
export function listAlertRules() { seed(); return [...rules.values()].sort((a,b)=>a.name.localeCompare(b.name)); }
export function createAlertRule(input: Omit<AlertRule,'id'|'createdAt'|'lastTriggeredAt'|'active'>) { seed(); const id=`alert-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; const rule:AlertRule={...input,id,createdAt:new Date().toISOString(),lastTriggeredAt:null,active:false}; rules.set(id,rule); return rule; }
export function updateAlertRule(id:string, patch:Partial<AlertRule>) { seed(); const r=rules.get(id); if(!r)return null; Object.assign(r,patch,{id}); rules.set(id,r); return r; }
export function deleteAlertRule(id:string) { seed(); return rules.delete(id); }
export function listAlertEvents(opts?:{activeOnly?:boolean;limit?:number}) { seed(); const out=opts?.activeOnly?events.filter(e=>!e.acknowledged):events; return out.slice(-(opts?.limit??100)).reverse(); }
export function acknowledgeAlert(id:string) { const e=events.find(x=>x.id===id); if(!e)return null; e.acknowledged=true; const r=rules.get(e.ruleId); if(r)r.active=false; return e; }
export function evaluateTelemetry(deviceId:string, streamId:string, value:number) {
  seed(); const triggered:AlertEvent[]=[]; const now=Date.now();
  for(const rule of rules.values()) {
    if(!rule.enabled || rule.deviceId!==deviceId || rule.streamId!==streamId) continue;
    const matched=compare(value,rule.operator,rule.threshold);
    rule.active=matched;
    if(!matched) continue;
    const last=rule.lastTriggeredAt?Date.parse(rule.lastTriggeredAt):0;
    if(last && now-last < rule.cooldownSeconds*1000) continue;
    const event:AlertEvent={id:`event-${now}-${Math.random().toString(36).slice(2,8)}`,ruleId:rule.id,ruleName:rule.name,deviceId,streamId,value,threshold:rule.threshold,operator:rule.operator,severity:rule.severity,message:`${streamId} is ${value} ${rule.operator} ${rule.threshold}`,timestamp:new Date(now).toISOString(),acknowledged:false};
    events.push(event); if(events.length>1000)events.splice(0,events.length-1000); rule.lastTriggeredAt=event.timestamp; triggered.push(event); void deliverWebhook(event,rule);
  }
  return triggered;
}
export function listAlertDeliveries(limit=100) { return deliveries.slice(-limit).reverse(); }

async function deliverWebhook(event:AlertEvent, rule:AlertRule) {
  if (rule.action !== 'webhook' || !rule.webhookUrl) return;
  let url:URL;
  try { url = new URL(rule.webhookUrl); if (!['http:','https:'].includes(url.protocol)) throw new Error('Webhook URL must use HTTP or HTTPS'); }
  catch (e) { deliveries.push({id:`delivery-${Date.now()}`,eventId:event.id,ruleId:rule.id,url:rule.webhookUrl,status:'failed',statusCode:null,error:e instanceof Error?e.message:'Invalid URL',timestamp:new Date().toISOString()}); return; }
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(), 8000);
  try {
    const response = await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-sylvia-event':'telemetry.alert'},body:JSON.stringify({type:'telemetry.alert',event,rule:{id:rule.id,name:rule.name,severity:rule.severity}}),signal:controller.signal});
    deliveries.push({id:`delivery-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,eventId:event.id,ruleId:rule.id,url:rule.webhookUrl,status:response.ok?'sent':'failed',statusCode:response.status,error:response.ok?null:`HTTP ${response.status}`,timestamp:new Date().toISOString()});
  } catch (e) { deliveries.push({id:`delivery-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,eventId:event.id,ruleId:rule.id,url:rule.webhookUrl,status:'failed',statusCode:null,error:e instanceof Error?e.message:'Webhook delivery failed',timestamp:new Date().toISOString()}); }
  finally { clearTimeout(timer); if(deliveries.length>1000) deliveries.splice(0,deliveries.length-1000); }
}

export function testAlertWebhook(ruleId:string) { seed(); const rule=rules.get(ruleId); if(!rule)return null; const event:AlertEvent={id:`test-${Date.now()}`,ruleId:rule.id,ruleName:rule.name,deviceId:rule.deviceId,streamId:rule.streamId,value:rule.threshold,threshold:rule.threshold,operator:rule.operator,severity:rule.severity,message:`Test alert for ${rule.name}`,timestamp:new Date().toISOString(),acknowledged:false}; void deliverWebhook(event,rule); return event; }

export function seedAlertRule(input:Omit<AlertRule,'id'|'createdAt'|'lastTriggeredAt'|'active'>) { seed(); if([...rules.values()].some(r=>r.deviceId===input.deviceId&&r.streamId===input.streamId&&r.name===input.name)) return; createAlertRule(input); }
