-- SYLVIA v0.53: persistent datastream registry and telemetry linkage.

create table if not exists public.datastream_registry (
  datastream_id text primary key,
  device_id text not null references public.device_registry(device_id) on delete cascade,
  name text not null,
  value_type text not null check (value_type in ('Number','Boolean','String')),
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, name)
);

create index if not exists idx_datastream_registry_device
  on public.datastream_registry(device_id);

alter table public.datastream_registry enable row level security;
