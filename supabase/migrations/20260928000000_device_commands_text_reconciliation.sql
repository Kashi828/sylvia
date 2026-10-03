-- SYLVIA v0.68 — reconcile public.device_commands with the text-ID runtime.
--
-- This migration is intentionally idempotent:
--   * If public.device_commands is already the text-ID runtime schema, it is a no-op.
--   * If the legacy UUID schema is still present, it is rebuilt only when empty.
--   * A non-empty legacy table is never destroyed.

BEGIN;

DO $$
DECLARE
  table_exists boolean;
  text_id_schema boolean;
  expected_status_check boolean;
  legacy_rows bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name='device_commands'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'device_commands does not exist; creating the runtime schema';
  ELSE
    SELECT count(*) = 2
      INTO text_id_schema
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='device_commands'
      AND column_name IN ('id','device_id')
      AND data_type='text';

    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public'
        AND t.relname='device_commands'
        AND c.contype='c'
        AND pg_get_constraintdef(c.oid) LIKE '%queued%'
        AND pg_get_constraintdef(c.oid) LIKE '%acked%'
    ) INTO expected_status_check;

    IF text_id_schema AND expected_status_check THEN
      RAISE NOTICE 'device_commands already matches the text-ID runtime schema; no rebuild needed';
      RETURN;
    END IF;

    SELECT count(*) INTO legacy_rows FROM public.device_commands;
    RAISE NOTICE 'device_commands legacy rows: %', legacy_rows;

    IF legacy_rows > 0 THEN
      RAISE EXCEPTION
        'device_commands holds % row(s) with a legacy/incompatible schema; refusing destructive reconciliation',
        legacy_rows;
    END IF;

    DROP TABLE public.device_commands;
  END IF;

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
    ON public.device_commands(device_id, status, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_device_commands_created
    ON public.device_commands(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_device_commands_device_created
    ON public.device_commands(device_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_device_commands_device_status
    ON public.device_commands(device_id, status, created_at ASC);

  ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

  COMMENT ON TABLE public.device_commands IS
    'Durable cloud-to-device command queue. Text ids, statuses queued/sent/acked/failed.';
END $$;

COMMIT;
