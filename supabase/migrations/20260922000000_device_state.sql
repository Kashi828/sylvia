-- Persist lightweight device-reported state for realtime hardware status.
alter table public.device_registry
  add column if not exists state jsonb not null default '{}'::jsonb;

create index if not exists idx_device_registry_online_last_seen
  on public.device_registry(online, last_seen desc);
