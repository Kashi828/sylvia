-- SYLVIA persistent device identity hardening
-- Safe to run against databases that already applied the v0.51 core migration.

ALTER TABLE public.device_registry
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'ESP32 Device',
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temperature double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battery double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_preview text;

CREATE INDEX IF NOT EXISTS idx_device_registry_token_hash
  ON public.device_registry(token_hash);
