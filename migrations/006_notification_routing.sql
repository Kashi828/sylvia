-- SYLVIA v0.38 notification routing indexes.
-- Routing is subscription-driven; notification records remain source events.
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_enabled_scope
  ON notification_subscriptions(user_id, project_id, enabled);
CREATE INDEX IF NOT EXISTS idx_notifications_kind_severity
  ON notifications(kind, severity, timestamp DESC);
