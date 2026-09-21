-- SYLVIA persistent command queue and acknowledgement history
-- Safe to apply after the v0.51 core migration.

create table if not exists public.device_commands (
  id text primary key,
  device_id text not null,
  command text not null,
  payload jsonb,
  status text not null default 'queued'
    check (status in ('queued','sent','acked','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  acked_at timestamptz,
  result jsonb
);

create index if not exists idx_device_commands_device_created
  on public.device_commands(device_id, created_at desc);

create index if not exists idx_device_commands_device_status
  on public.device_commands(device_id, status, created_at asc);

alter table public.device_commands enable row level security;
