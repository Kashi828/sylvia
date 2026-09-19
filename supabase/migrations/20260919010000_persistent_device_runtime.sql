-- SYLVIA v0.51.0-beta.3: normalize the persistent hardware registry.
-- Runtime device identity is stored in public.device_registry because the
-- cloud/MQTT path uses string-compatible device IDs.

alter table public.device_registry
  add column if not exists type text not null default 'ESP32 Device',
  add column if not exists token_hash text,
  add column if not exists token_preview text,
  add column if not exists online boolean not null default false,
  add column if not exists temperature double precision not null default 0,
  add column if not exists battery double precision not null default 0;

create unique index if not exists idx_device_registry_token_hash
  on public.device_registry(token_hash)
  where token_hash is not null;

create index if not exists idx_device_registry_device_id
  on public.device_registry(device_id);

update public.device_registry
set online = (lifecycle = 'online')
where online is distinct from (lifecycle = 'online');

update public.device_registry
set battery = greatest(0, least(100, battery))
where battery < 0 or battery > 100;
