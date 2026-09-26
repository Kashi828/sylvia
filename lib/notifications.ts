import { query, databaseConfigured } from '@/lib/db';
import { listAlertEvents, listAlertDeliveries } from '@/lib/alerts';
import { listSubscriptions, type NotificationSubscription } from '@/lib/notification-subscriptions';

export type NotificationKind = 'alert' | 'delivery' | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success' | 'error';
export type Notification = {
  id: string; kind: NotificationKind; severity: NotificationSeverity;
  title: string; message: string; timestamp: string; read: boolean;
  deviceId?: string; streamId?: string; sourceId?: string; projectId?: string; userId?: string;
};
export type NotificationPreferences = {
  inApp: boolean; alertNotifications: boolean; webhookNotifications: boolean;
  criticalOnly: boolean;
};

const readIds = new Set<string>();
let preferences: NotificationPreferences = { inApp:true, alertNotifications:true, webhookNotifications:true, criticalOnly:false };

async function sourceNotifications(): Promise<Notification[]> {
  if (databaseConfigured()) {
    try {
      const alerts = await query<any>(`SELECT id,rule_name,message,timestamp,acknowledged,device_id,stream_id,project_id,severity FROM public.alert_events ORDER BY timestamp DESC LIMIT 200`);
      const deliveries = await query<any>(`SELECT id,url,status,status_code,error,timestamp,project_id FROM public.alert_deliveries ORDER BY timestamp DESC LIMIT 200`);
      return [...alerts.rows.map((e:any)=>({id:`alert:${e.id}`,kind:'alert' as const,severity:String(e.severity) as NotificationSeverity,title:String(e.rule_name),message:String(e.message),timestamp:new Date(e.timestamp).toISOString(),read:Boolean(e.acknowledged),deviceId:String(e.device_id),streamId:String(e.stream_id),sourceId:String(e.id),projectId:String(e.project_id)})),
        ...deliveries.rows.map((d:any)=>({id:`delivery:${d.id}`,kind:'delivery' as const,severity:(d.status==='sent'?'success':'error') as NotificationSeverity,title:d.status==='sent'?'Webhook delivered':'Webhook delivery failed',message:d.error||(`${d.url} responded with HTTP ${d.status_code??'unknown'}`),timestamp:new Date(d.timestamp).toISOString(),read:readIds.has(`delivery:${d.id}`),sourceId:String(d.id),projectId:String(d.project_id)}))]
        .sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
    } catch {
      // fall through to the existing runtime source
    }
  }
  const alerts = listAlertEvents({limit: 200}).map(e => ({ id:`alert:${e.id}`, kind:'alert' as const, severity:e.severity as NotificationSeverity, title:e.ruleName, message:e.message, timestamp:e.timestamp, read:readIds.has(`alert:${e.id}`), deviceId:String(e.deviceId), streamId:String(e.streamId), sourceId:e.id, projectId:'sylvia-local-workspace' }));
  const deliveries = listAlertDeliveries(200).map(d => ({ id:`delivery:${d.id}`, kind:'delivery' as const, severity:(d.status==='sent'?'success':'error') as NotificationSeverity, title:d.status==='sent'?'Webhook delivered':'Webhook delivery failed', message:d.error || `${d.url} responded with HTTP ${d.statusCode ?? 'unknown'}`, timestamp:d.timestamp, read:readIds.has(`delivery:${d.id}`), sourceId:d.id, projectId:'sylvia-local-workspace' }));
  return [...alerts,...deliveries].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
}
function applyPreferences(items:Notification[]) {
  return items.filter(n => {
    if(!preferences.inApp) return false;
    if(n.kind==='alert' && !preferences.alertNotifications) return false;
    if(n.kind==='delivery' && !preferences.webhookNotifications) return false;
    if(preferences.criticalOnly && n.severity!=='critical') return false;
    return true;
  });
}

async function loadPreferencesFromDb() {
  if(!databaseConfigured()) return;
  try {
    const r=await query<any>('SELECT in_app, alert_notifications, webhook_notifications, critical_only FROM notification_preferences WHERE preference_key=$1',['default']);
    if(r.rows[0]) preferences={inApp:r.rows[0].in_app,alertNotifications:r.rows[0].alert_notifications,webhookNotifications:r.rows[0].webhook_notifications,criticalOnly:r.rows[0].critical_only};
  } catch { /* memory fallback */ }
}

async function persistSourceNotifications(items:Notification[]) {
  if(!databaseConfigured() || !items.length) return;
  try {
    for(const n of items) await query(
      `INSERT INTO notifications (id,kind,severity,title,message,timestamp,read,device_id,stream_id,source_id,project_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind,severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,timestamp=EXCLUDED.timestamp,device_id=EXCLUDED.device_id,stream_id=EXCLUDED.stream_id,source_id=EXCLUDED.source_id,project_id=EXCLUDED.project_id`,
      [n.id,n.kind,n.severity,n.title,n.message,n.timestamp,n.read,n.deviceId??null,n.streamId??null,n.sourceId??null,n.projectId??"sylvia-local-workspace"]
    );
  } catch { /* retain in-memory operation */ }
}

async function readDurable(limit:number,projectId="sylvia-local-workspace"):Promise<Notification[]|null> {
  if(!databaseConfigured()) return null;
  try {
    const r=await query<any>(`SELECT id,kind,severity,title,message,timestamp,read,device_id,stream_id,source_id,project_id FROM notifications WHERE project_id=$2 ORDER BY timestamp DESC LIMIT $1`,[limit]);
    return r.rows.map((n:any)=>({id:n.id,kind:n.kind,severity:n.severity,title:n.title,message:n.message,timestamp:new Date(n.timestamp).toISOString(),read:Boolean(n.read),deviceId:n.device_id??undefined,streamId:n.stream_id??undefined,sourceId:n.source_id??undefined,projectId:n.project_id??undefined}));
  } catch { return null; }
}

function subscriptionMatches(n:Notification, s:NotificationSubscription) {
  const kindMatches = s.kind === 'all' || s.kind === n.kind;
  const severityMatches = s.severity === 'all' || s.severity === n.severity;
  return s.enabled && kindMatches && severityMatches;
}

export async function routeNotifications(items:Notification[], userId='usr_owner', projectId='sylvia-local-workspace') {
  const subscriptions = await listSubscriptions(userId, projectId);
  return items.filter(n => {
    if (n.projectId && n.projectId !== projectId) return false;
    return subscriptions.some(s => subscriptionMatches(n, s));
  }).map(n => ({...n, userId, projectId}));
}

export async function listNotifications(limit=100, userId='usr_owner', projectId='sylvia-local-workspace') {
  await loadPreferencesFromDb();
  const sources=await sourceNotifications();
  await persistSourceNotifications(sources);
  const durable=await readDurable(Math.min(200,Math.max(1,limit)),projectId);
  const routed=await routeNotifications(durable ?? sources,userId,projectId);
  return applyPreferences(routed).slice(0,limit);
}

export async function markNotificationRead(id:string,projectId="sylvia-local-workspace") {
  readIds.add(id);
  if(databaseConfigured()) { try { await query('UPDATE notifications SET read=TRUE WHERE id=$1 AND project_id=$2',[id,projectId]); } catch {} }
  return true;
}

export async function markAllNotificationsRead(projectId="sylvia-local-workspace") {
  for(const n of await sourceNotifications()) readIds.add(n.id);
  if(databaseConfigured()) { try { await query('UPDATE notifications SET read=TRUE WHERE project_id=$1 AND (id LIKE $2 OR id LIKE $3)',[projectId,'alert:%','delivery:%']); } catch {} }
  return true;
}

export async function getUnreadNotificationCount(userId='usr_owner', projectId='sylvia-local-workspace') { return (await listNotifications(200,userId,projectId)).filter(n=>!n.read).length; }
export function getNotificationPreferences() { return {...preferences}; }
export async function updateNotificationPreferences(patch:Partial<NotificationPreferences>) {
  preferences={...preferences,...patch};
  if(databaseConfigured()) { try { await query(`INSERT INTO notification_preferences (preference_key,in_app,alert_notifications,webhook_notifications,critical_only) VALUES ('default',$1,$2,$3,$4) ON CONFLICT (preference_key) DO UPDATE SET in_app=EXCLUDED.in_app,alert_notifications=EXCLUDED.alert_notifications,webhook_notifications=EXCLUDED.webhook_notifications,critical_only=EXCLUDED.critical_only,updated_at=NOW()`,[preferences.inApp,preferences.alertNotifications,preferences.webhookNotifications,preferences.criticalOnly]); } catch {} }
  return {...preferences};
}

export async function getNotificationStats(userId='usr_owner',projectId='sylvia-local-workspace') {
  const items=await listNotifications(200,userId,projectId);
  return {total:items.length,unread:items.filter(n=>!n.read).length,alerts:items.filter(n=>n.kind==='alert').length,deliveries:items.filter(n=>n.kind==='delivery').length};
}
