-- SYLVIA v0.51: clean Supabase/PostgreSQL foundation.
-- This is a fresh schema for the new Supabase project. No legacy provider
-- migration history is required.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('Owner','Admin','Builder','Viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null,
  token_hash text not null,
  online boolean not null default false,
  last_seen timestamptz
);

create table if not exists public.datastreams (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  name text not null,
  value_type text not null check (value_type in ('Number','Boolean','String')),
  unit text,
  created_at timestamptz not null default now()
);

-- Device telemetry deliberately uses text identifiers because MQTT/device IDs
-- are not required to be UUIDs.
create table if not exists public.telemetry_events (
  id bigint generated always as identity primary key,
  device_id text not null,
  datastream_id text not null,
  value numeric,
  value_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.device_registry (
  device_id text primary key,
  name text not null,
  type text not null default 'ESP32 Device',
  lifecycle text not null check (lifecycle in ('provisioning','online','offline','disabled')),
  last_seen timestamptz,
  firmware text,
  transport text not null default 'unknown' check (transport in ('rest','mqtt','unknown')),
  online boolean not null default false,
  temperature double precision not null default 0,
  battery double precision not null default 0,
  token_hash text,
  token_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  kind text not null,
  severity text not null,
  title text not null,
  message text not null,
  timestamp timestamptz not null,
  read boolean not null default false,
  device_id text,
  stream_id text,
  source_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  preference_key text primary key,
  in_app boolean not null default true,
  alert_notifications boolean not null default true,
  webhook_notifications boolean not null default true,
  critical_only boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_subscriptions (
  id text primary key,
  user_id text not null,
  project_id text not null,
  kind text not null default 'all',
  severity text not null default 'all',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_preferences (preference_key)
values ('default')
on conflict (preference_key) do nothing;

insert into public.notification_subscriptions (id, user_id, project_id, kind, severity)
values ('sub_default', 'usr_owner', 'sylvia-local-workspace', 'all', 'all')
on conflict (id) do nothing;

create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_devices_project on public.devices(project_id);
create index if not exists idx_devices_last_seen on public.devices(last_seen desc);
create index if not exists idx_datastreams_device on public.datastreams(device_id);
create index if not exists idx_telemetry_device_stream_time on public.telemetry_events(device_id, datastream_id, occurred_at desc);
create index if not exists idx_telemetry_stream_time on public.telemetry_events(datastream_id, occurred_at desc);
create index if not exists idx_notifications_timestamp on public.notifications(timestamp desc);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_kind_severity on public.notifications(kind, severity, timestamp desc);
create index if not exists idx_notification_subscriptions_scope on public.notification_subscriptions(user_id, project_id);
create index if not exists idx_notification_subscriptions_enabled_scope on public.notification_subscriptions(user_id, project_id, enabled);
create index if not exists idx_device_registry_lifecycle on public.device_registry(lifecycle);
create index if not exists idx_device_registry_last_seen on public.device_registry(last_seen desc);
create index if not exists idx_device_registry_updated_at on public.device_registry(updated_at desc);
create index if not exists idx_device_registry_token_hash on public.device_registry(token_hash);

-- SYLVIA's server-side runtime currently owns persistence, so public client
-- access is disabled until Supabase Auth/RLS policies are introduced.
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.devices enable row level security;
alter table public.datastreams enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.device_registry enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_subscriptions enable row level security;
