-- SYLVIA v0.51.0-beta.3: align the persistent device registry
-- with the runtime device model used by registration and MQTT ingestion.

alter table public.device_registry
  add column if not exists type text not null default 'ESP32 Device',
  add column if not exists online boolean not null default false,
  add column if not exists temperature double precision not null default 0,
  add column if not exists battery double precision not null default 0,
  add column if not exists token_hash text,
  add column if not exists token_preview text;

create index if not exists idx_device_registry_token_hash
  on public.device_registry(token_hash);

update public.device_registry
set type = coalesce(nullif(type,''),'ESP32 Device')
where type is null or type = '';

update public.device_registry
set online = (lifecycle = 'online')
where online is distinct from (lifecycle = 'online');

update public.device_registry
set battery = greatest(0, least(100, battery))
where battery < 0 or battery > 100;
