-- SYLVIA v0.61.0 durable audit trail

CREATE TABLE IF NOT EXISTS public.audit_events (
  id text primary key,
  owner_id text,
  project_id text not null default 'sylvia-local-workspace',
  actor_type text not null check (actor_type in ('session','api_key','device','system','unknown')),
  actor_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_owner_time
  ON public.audit_events(owner_id, created_at desc);
CREATE INDEX IF NOT EXISTS idx_audit_events_project_time
  ON public.audit_events(project_id, created_at desc);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource
  ON public.audit_events(resource_type, resource_id, created_at desc);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
