import { getNotificationProvider, type NotificationProvider } from '@/lib/notification-providers';
import type { Notification, NotificationSeverity } from '@/lib/notifications';

export type NotificationDelivery = {
  id: string; notificationId: string; providerId: string; kind: string;
  status: 'sent'|'failed'; statusCode: number|null; error: string|null; timestamp: string;
};
const g = globalThis as typeof globalThis & { __sylviaNotificationDeliveries?: NotificationDelivery[] };
if (!g.__sylviaNotificationDeliveries) g.__sylviaNotificationDeliveries = [];
const deliveries = g.__sylviaNotificationDeliveries;

function record(input: Omit<NotificationDelivery,'id'|'timestamp'>) {
  deliveries.push({...input,id:`nd-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,timestamp:new Date().toISOString()});
  if (deliveries.length > 1000) deliveries.splice(0, deliveries.length - 1000);
  return deliveries.at(-1)!;
}
export function listNotificationDeliveries(limit=100) { return deliveries.slice(-limit).reverse(); }

export async function deliverNotification(notification: Notification, provider: NotificationProvider, recipient?: string) {
  if (!provider.enabled) return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:'failed',statusCode:null,error:'Provider is disabled'});
  if (provider.kind === 'console') {
    console.info('[SYLVIA notification]', {notification, recipient});
    return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:'sent',statusCode:null,error:null});
  }
  if (!provider.endpoint) return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:'failed',statusCode:null,error:'Provider endpoint is not configured'});
  let url: URL;
  try { url = new URL(provider.endpoint); if (!['http:','https:'].includes(url.protocol)) throw new Error('Provider endpoint must use HTTP or HTTPS'); }
  catch (e) { return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:'failed',statusCode:null,error:e instanceof Error?e.message:'Invalid endpoint'}); }
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  const payload = provider.kind === 'email-http'
    ? {type:'email',from:provider.from || 'no-reply@sylvia.local',to:recipient || '',subject:notification.title,text:notification.message,metadata:{severity:notification.severity,sourceId:notification.sourceId}}
    : {type:'push',to:recipient || '',title:notification.title,body:notification.message,data:{severity:notification.severity,sourceId:notification.sourceId}};
  try {
    const response = await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-sylvia-notification':provider.kind},body:JSON.stringify(payload),signal:controller.signal});
    return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:response.ok?'sent':'failed',statusCode:response.status,error:response.ok?null:`HTTP ${response.status}`});
  } catch (e) {
    return record({notificationId:notification.id,providerId:provider.id,kind:provider.kind,status:'failed',statusCode:null,error:e instanceof Error?e.message:'Delivery failed'});
  } finally { clearTimeout(timer); }
}

export async function testNotificationProvider(providerId: string, severity: NotificationSeverity='info') {
  const provider = getNotificationProvider(providerId); if (!provider) return null;
  const notification: Notification = {id:`test-${Date.now()}`,kind:'system',severity,title:'SYLVIA test notification',message:`Test delivery through ${provider.name}`,timestamp:new Date().toISOString(),read:false,projectId:'sylvia-local-workspace'};
  return deliverNotification(notification, provider);
}
