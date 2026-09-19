-- SYLVIA v0.51: reconcile the real Supabase device table for hardware runtime.
-- public.devices is the authoritative persistent device identity table.

alter table public.devices
  add column if not exists token_preview text,
  add column if not exists device_type text not null default 'ESP32 Device',
  add column if not exists temperature double precision not null default 0,
  add column if not exists battery double precision not null default 0;

create index if not exists idx_devices_token_hash
  on public.devices(token_hash)
  where token_hash is not null;

create unique index if not exists idx_devices_device_key
  on public.devices(device_key);
