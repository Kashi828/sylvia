-- SYLVIA v0.60.0 device token lifecycle

ALTER TABLE public.device_registry
  ADD COLUMN IF NOT EXISTS token_generation integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS token_revoked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS token_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_last_authenticated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_device_registry_token_state
  ON public.device_registry(owner_id, token_revoked);
