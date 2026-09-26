-- SYLVIA v0.58.0 persistent alerts

CREATE TABLE IF NOT EXISTS public.alert_rules (
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

CREATE TABLE IF NOT EXISTS public.alert_events (
  id text primary key,
  owner_id text not null,
  project_id text not null default 'sylvia-local-workspace',
  rule_id text not null references public.alert_rules(id) on delete cascade,
  rule_name text not null,
  device_id text not null,
  stream_id text not null,
  value double precision not null,
  threshold double precision not null,
  operator text not null check (operator in ('>','>=','<','<=','=','!=')),
  severity text not null check (severity in ('info','warning','critical')),
  message text not null,
  timestamp timestamptz not null default now(),
  acknowledged boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.alert_deliveries (
  id text primary key,
  owner_id text not null,
  project_id text not null default 'sylvia-local-workspace',
  event_id text not null references public.alert_events(id) on delete cascade,
  rule_id text not null references public.alert_rules(id) on delete cascade,
  url text not null,
  status text not null check (status in ('sent','failed')),
  status_code integer,
  error text,
  timestamp timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_owner ON public.alert_rules(owner_id, enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_match ON public.alert_rules(device_id, stream_id, enabled);
CREATE INDEX IF NOT EXISTS idx_alert_events_owner_time ON public.alert_events(owner_id, timestamp desc);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_owner_time ON public.alert_deliveries(owner_id, timestamp desc);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;