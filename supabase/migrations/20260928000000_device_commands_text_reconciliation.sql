-- SYLVIA v0.68 — reconcile public.device_commands with the text-ID runtime.
--
-- PROBLEM
--   public.device_commands was never part of the v0.54+ text-ID reconciliation. It is
--   still the legacy UUID table:
--     * id / device_id are uuid, with a device_id FK -> devices(id)
--     * devices(id) belongs to the unused legacy UUID device graph (0 rows)
--     * status CHECK allows ('pending','sent','acknowledged','failed','expired')
--   The runtime (lib/persistent-commands.ts) writes text ids of the form
--   cmd_<epoch>_<rand>, device ids of the form <epoch><rand>, and statuses
--   queued / sent / acked / failed. Every insert therefore failed with
--   "invalid input syntax for type uuid", which createPersistentCommand swallowed
--   into a null return — so the command endpoint answered 503 and the entire
--   cloud -> device command path (v1.0 gate, acceptance runbook section 6) could
--   never work.
--
-- FIX
--   Rebuild the table with the schema the migrations already declare and the code
--   expects. Safe because the table is empty and the legacy devices graph is unused:
--   no command has ever been acknowledged against this schema (every insert failed).
--
--   NOTE: this rebuild is destructive by design. It is safe only while
--   device_commands is empty, which the pre-flight count below asserts.

BEGIN;

DO $$
DECLARE
  legacy_rows bigint;
BEGIN
  SELECT count(*) INTO legacy_rows FROM public.device_commands;
  RAISE NOTICE 'device_commands legacy rows: %', legacy_rows;
  IF legacy_rows > 0 THEN
    RAISE EXCEPTION
      'device_commands holds % row(s); migrating legacy uuid commands is not implemented', legacy_rows;
  END IF;
END $$;

ALTER TABLE public.device_commands DROP CONSTRAINT IF EXISTS device_commands_device_id_fkey;

DROP TABLE IF EXISTS public.device_commands;

CREATE TABLE public.device_commands (
  id text primary key,
  device_id text not null,
  command text not null,
  payload jsonb,
  status text not null default 'queued'
    check (status in ('queued','sent','acked','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  acked_at timestamptz,
  result jsonb
);

CREATE INDEX IF NOT EXISTS idx_device_commands_pending
  on public.device_commands(device_id, status, created_at asc);
CREATE INDEX IF NOT EXISTS idx_device_commands_created
  on public.device_commands(created_at desc);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_created
  on public.device_commands(device_id, created_at desc);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_status
  on public.device_commands(device_id, status, created_at asc);

ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.device_commands IS
  'Durable cloud-to-device command queue. Text ids, statuses queued/sent/acked/failed.';

COMMIT;