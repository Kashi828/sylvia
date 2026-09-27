-- SYLVIA runtime index hardening.
-- Covers foreign-key columns reported by Supabase performance advisors.
CREATE INDEX IF NOT EXISTS idx_alert_events_rule_id
  ON public.alert_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_event_id
  ON public.alert_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_rule_id
  ON public.alert_deliveries(rule_id);
CREATE INDEX IF NOT EXISTS idx_device_claims_device_id
  ON public.device_claims(device_id);
