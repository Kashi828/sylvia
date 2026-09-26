-- SYLVIA v0.57.0 persistent project API keys

CREATE TABLE IF NOT EXISTS public.project_api_keys (
  id text primary key,
  owner_id text not null,
  name text not null,
  token_hash text not null unique,
  token_preview text not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_owner
  ON public.project_api_keys(owner_id, revoked);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_hash
  ON public.project_api_keys(token_hash);
ALTER TABLE public.project_api_keys ENABLE ROW LEVEL SECURITY;