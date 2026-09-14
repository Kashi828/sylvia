-- SYLVIA v0.37 notification subscriptions.
CREATE TABLE IF NOT EXISTS notification_subscriptions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 kind TEXT NOT NULL DEFAULT 'all',
 severity TEXT NOT NULL DEFAULT 'all',
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_scope ON notification_subscriptions(user_id,project_id);
INSERT INTO notification_subscriptions(id,user_id,project_id,kind,severity)
VALUES('sub_default','usr_owner','sylvia-local-workspace','all','all') ON CONFLICT(id) DO NOTHING;
