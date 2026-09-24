alter table public.device_registry
  add column if not exists owner_id text;

create index if not exists idx_device_registry_owner
  on public.device_registry(owner_id);