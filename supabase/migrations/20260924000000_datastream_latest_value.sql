-- SYLVIA v0.53: persist the latest value for each datastream.

alter table public.datastream_registry
  add column if not exists last_value_json jsonb,
  add column if not exists last_occurred_at timestamptz;

create index if not exists idx_datastream_registry_latest
  on public.datastream_registry(device_id, last_occurred_at desc);
