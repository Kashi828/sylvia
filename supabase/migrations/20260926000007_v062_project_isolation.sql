-- SYLVIA v0.62.0 project isolation foundation

CREATE TABLE IF NOT EXISTS public.workspace_projects (
  id text primary key,
  owner_id text,
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

INSERT INTO public.workspace_projects (id, owner_id, name, slug)
VALUES ('sylvia-local-workspace', NULL, 'SYLVIA Cloud Project', 'sylvia-cloud-project')
ON CONFLICT (id) DO NOTHING;

UPDATE public.workspace_projects p
SET owner_id = wm.user_id,
    updated_at = now()
FROM public.workspace_members wm
WHERE p.id = wm.project_id
  AND p.id = 'sylvia-local-workspace'
  AND p.owner_id IS NULL
  AND wm.status = 'Active'
  AND wm.role = 'Owner'
  AND wm.user_id IS NOT NULL;

ALTER TABLE public.device_registry
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.device_events
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.project_api_keys
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.datastream_registry
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.telemetry_events
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'sylvia-local-workspace';

UPDATE public.datastream_registry d
SET project_id = dev.project_id
FROM public.device_registry dev
WHERE d.device_id = dev.device_id
  AND (d.project_id IS NULL OR d.project_id = 'sylvia-local-workspace');

UPDATE public.telemetry_events t
SET project_id = dev.project_id
FROM public.device_registry dev
WHERE t.device_id = dev.device_id
  AND (t.project_id IS NULL OR t.project_id = 'sylvia-local-workspace');

UPDATE public.device_events e
SET project_id = dev.project_id
FROM public.device_registry dev
WHERE e.device_id = dev.device_id
  AND (e.project_id IS NULL OR e.project_id = 'sylvia-local-workspace');

CREATE INDEX IF NOT EXISTS idx_workspace_projects_owner
  ON public.workspace_projects(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_device_registry_project_owner
  ON public.device_registry(project_id, owner_id);

CREATE INDEX IF NOT EXISTS idx_device_events_project_time
  ON public.device_events(project_id, occurred_at desc);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_project
  ON public.project_api_keys(project_id, owner_id, revoked);

CREATE INDEX IF NOT EXISTS idx_datastream_registry_project_device
  ON public.datastream_registry(project_id, device_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_project_time
  ON public.telemetry_events(project_id, occurred_at desc);

CREATE INDEX IF NOT EXISTS idx_notifications_project_time
  ON public.notifications(project_id, timestamp desc);

UPDATE public.automation_runs r
SET project_id = s.project_id
FROM public.schedules s
WHERE r.source_type = 'schedule'
  AND r.source_id = s.id
  AND (r.project_id IS NULL OR r.project_id = 'sylvia-local-workspace');

UPDATE public.automation_runs r
SET project_id = a.project_id
FROM public.automation_rules a
WHERE r.source_type = 'rule'
  AND r.source_id = a.id
  AND (r.project_id IS NULL OR r.project_id = 'sylvia-local-workspace');

CREATE INDEX IF NOT EXISTS idx_automation_runs_project_time
  ON public.automation_runs(project_id, owner_id, created_at desc);

ALTER TABLE public.workspace_projects ENABLE ROW LEVEL SECURITY;
