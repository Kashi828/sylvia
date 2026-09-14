export type NotificationProviderKind = 'webhook' | 'email-http' | 'push-http' | 'console';
export type NotificationProvider = {
  id: string;
  name: string;
  kind: NotificationProviderKind;
  enabled: boolean;
  endpoint?: string;
  from?: string;
  createdAt: string;
};

type Store = typeof globalThis & { __sylviaNotificationProviders?: NotificationProvider[] };
const g = globalThis as Store;
if (!g.__sylviaNotificationProviders) {
  g.__sylviaNotificationProviders = [{
    id: 'provider-console', name: 'Local console', kind: 'console', enabled: true,
    createdAt: new Date().toISOString()
  }];
}
const store = g.__sylviaNotificationProviders;

export function listNotificationProviders() { return [...store]; }
export function getNotificationProvider(id: string) { return store.find(p => p.id === id) ?? null; }
export function upsertNotificationProvider(input: Partial<NotificationProvider> & Pick<NotificationProvider, 'name'|'kind'>) {
  const id = input.id || `provider-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const existing = store.find(p => p.id === id);
  const next: NotificationProvider = {
    id, name: input.name, kind: input.kind, enabled: input.enabled !== false,
    endpoint: input.endpoint || undefined, from: input.from || undefined,
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (existing) Object.assign(existing, next); else store.push(next);
  return next;
}
export function deleteNotificationProvider(id: string) {
  if (id === 'provider-console') return false;
  const index = store.findIndex(p => p.id === id);
  if (index < 0) return false;
  store.splice(index, 1); return true;
}
