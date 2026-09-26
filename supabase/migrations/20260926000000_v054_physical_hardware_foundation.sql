-- SYLVIA v0.54.0 physical hardware foundation
-- Adds explicit ownership and durable fleet lifecycle events.

ALTER TABLE public.device_registry
  ADD COLUMN IF NOT EXISTS owner_id text;

CREATE INDEX IF NOT EXISTS idx_device_registry_owner
  ON public.device_registry(owner_id);

CREATE TABLE IF NOT EXISTS public.device_events (
  id text primary key,
  owner_id text,
  device_id text not null,
  kind text not null,
  severity text not null default 'info'
    check (severity in ('info','warning','critical','success','error')),
  message text not null,
  data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_device_events_owner_time
  ON public.device_events(owner_id, occurred_at desc);

CREATE INDEX IF NOT EXISTS idx_device_events_device_time
  ON public.device_events(device_id, occurred_at desc);

ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;
