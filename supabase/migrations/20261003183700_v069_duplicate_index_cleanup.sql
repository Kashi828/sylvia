-- SYLVIA v0.69 — remove duplicate indexes left by earlier runtime migrations.
-- No application behavior changes; only redundant index structures are removed.

DROP INDEX IF EXISTS public.idx_device_commands_device_status;
DROP INDEX IF EXISTS public.idx_device_registry_online_last_seen;
DROP INDEX IF EXISTS public.idx_devices_device_key;