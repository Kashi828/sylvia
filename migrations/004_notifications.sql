-- SYLVIA v0.36 durable notifications and preferences.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  stream_id TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);

CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_key TEXT PRIMARY KEY,
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  alert_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  webhook_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  critical_only BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO notification_preferences (preference_key)
VALUES ('default') ON CONFLICT (preference_key) DO NOTHING;
