-- SYLVIA v0.41 persistent fleet/device registry.
CREATE TABLE IF NOT EXISTS device_registry (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('provisioning','online','offline','disabled')),
  last_seen TIMESTAMPTZ,
  firmware TEXT,
  transport TEXT NOT NULL DEFAULT 'unknown' CHECK (transport IN ('rest','mqtt','unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_registry_lifecycle ON device_registry(lifecycle);
CREATE INDEX IF NOT EXISTS idx_device_registry_last_seen ON device_registry(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_device_registry_updated_at ON device_registry(updated_at DESC);
