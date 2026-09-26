-- SYLVIA v0.56.0 automation engine
-- Durable telemetry rules, schedules and execution history.

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id text primary key,
  owner_id text not null,
  project_id text not null default 'sylvia-local-workspace',
  name text not null,
  device_id text not null,
  stream_id text not null,
  operator text not null check (operator in ('>','>=','<','<=','=','!=')),
  threshold double precision not null,
  action text not null check (action in ('device_command','event')),
  command text,
  payload jsonb not null default '{}'::jsonb,
  cooldown_seconds integer not null default 300 check (cooldown_seconds >= 0),
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((action='event') or (command is not null and length(trim(command))>0))
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id text primary key,
  owner_id text not null,
  project_id text not null default 'sylvia-local-workspace',
  name text not null,
  device_id text not null,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  hour integer not null check (hour between 0 and 23),
  minute integer not null check (minute between 0 and 59),
  days_of_week integer[] not null default '{0,1,2,3,4,5,6}',
  timezone text not null default 'Asia/Kolkata',
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id text primary key,
  owner_id text not null,
  source_type text not null check (source_type in ('rule','schedule')),
  source_id text not null,
  device_id text not null,
  trigger_value double precision,
  action text not null,
  status text not null check (status in ('triggered','queued','dispatched','failed')),
  command_id text,
  error text,
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_runs_schedule_minute
  ON public.automation_runs(source_id, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_rules_owner
  ON public.automation_rules(owner_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_match
  ON public.automation_rules(device_id, stream_id, enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_owner_enabled
  ON public.schedules(owner_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automation_runs_owner_time
  ON public.automation_runs(owner_id, created_at desc);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;