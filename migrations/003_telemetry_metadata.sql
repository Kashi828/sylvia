-- SYLVIA v0.29 telemetry durability metadata.
-- Existing telemetry_events rows remain valid.
ALTER TABLE telemetry_events
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_telemetry_events_device_stream_time
  ON telemetry_events (device_id, datastream_id, occurred_at DESC);
