-- SYLVIA v0.51: persistent hardware identity.
-- Keeps device credentials and runtime identity in PostgreSQL so a NodeMCU
-- remains valid across serverless instances and application restarts.

alter table public.device_registry
  add column if not exists token_hash text,
  add column if not exists token_preview text;

create unique index if not exists idx_device_registry_token_hash
  on public.device_registry(token_hash)
  where token_hash is not null;

create index if not exists idx_device_registry_device_id
  on public.device_registry(device_id);
