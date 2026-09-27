-- SYLVIA runtime compatibility: reconcile empty legacy UUID-based tables
-- with the text-ID project-isolated runtime introduced in v0.54+.
DROP TABLE IF EXISTS public.alert_rules CASCADE;
CREATE TABLE public.alert_rules (
  id text primary key,
  owner_id text not null,
  project_id text not null default 'sylvia-local-workspace',
  name text not null,
  device_id text not null,
  stream_id text not null,
  operator text not null check (operator in ('>','>=','<','<=','=','!=')),
  threshold double precision not null,
  severity text not null check (severity in ('info','warning','critical')),
  cooldown_seconds integer not null default 300 check (cooldown_seconds >= 0),
  enabled boolean not null default true,
  action text not null default 'none' check (action in ('none','webhook')),
  webhook_url text not null default '',
  last_triggered_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_alert_rules_owner ON public.alert_rules(owner_id, enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_match ON public.alert_rules(device_id, stream_id, enabled);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
  id text primary key,
  kind text not null,
  severity text not null,
  title text not null,
  message text not null,
  timestamp timestamptz not null default now(),
  read boolean not null default false,
  device_id text,
  stream_id text,
  source_id text,
  project_id text not null default 'sylvia-local-workspace',
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_project_time ON public.notifications(project_id, timestamp desc);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(project_id, read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.notification_subscriptions CASCADE;
CREATE TABLE public.notification_subscriptions (
  id text primary key,
  user_id text not null,
  project_id text not null,
  kind text not null default 'all' check (kind in ('all','alert','delivery')),
  severity text not null default 'all' check (severity in ('all','info','warning','critical','success','error')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_scope
  ON public.notification_subscriptions(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_enabled_scope
  ON public.notification_subscriptions(user_id, project_id, enabled);
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.notification_subscriptions (id,user_id,project_id,kind,severity)
VALUES ('sub_default','usr_owner','sylvia-local-workspace','all','all')
ON CONFLICT (id) DO NOTHING;
