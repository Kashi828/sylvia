-- SYLVIA runtime compatibility schema for the server-side persistence layer.
-- Applied to production as migration "sylvia_runtime_compatibility".
CREATE TABLE IF NOT EXISTS public.device_registry (
  device_id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'ESP32 Device',
  lifecycle text NOT NULL DEFAULT 'provisioning' CHECK (lifecycle IN ('provisioning','online','offline','disabled')),
  last_seen timestamptz,
  firmware text,
  transport text NOT NULL DEFAULT 'unknown' CHECK (transport IN ('rest','mqtt','unknown')),
  online boolean NOT NULL DEFAULT false,
  temperature double precision NOT NULL DEFAULT 0,
  battery double precision NOT NULL DEFAULT 0,
  token_hash text,
  token_preview text,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sylvia_device_registry_online_last_seen ON public.device_registry(online,last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_sylvia_device_registry_token_hash ON public.device_registry(token_hash);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id text NOT NULL,
  datastream_id text NOT NULL,
  value numeric,
  value_json jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sylvia_telemetry_device_stream_time ON public.telemetry_events(device_id,datastream_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sylvia_telemetry_stream_time ON public.telemetry_events(datastream_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.datastream_registry (
  datastream_id text PRIMARY KEY,
  device_id text NOT NULL REFERENCES public.device_registry(device_id) ON DELETE CASCADE,
  name text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('Number','Boolean','String')),
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_value_json jsonb,
  last_occurred_at timestamptz,
  UNIQUE(device_id,name)
);
CREATE INDEX IF NOT EXISTS idx_sylvia_datastream_registry_device ON public.datastream_registry(device_id);
CREATE INDEX IF NOT EXISTS idx_sylvia_datastream_registry_latest ON public.datastream_registry(device_id,last_occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.sylvia_device_commands (
  id text PRIMARY KEY,
  device_id text NOT NULL,
  command text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','acked','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  acked_at timestamptz,
  result jsonb
);
CREATE INDEX IF NOT EXISTS idx_sylvia_commands_device_created ON public.sylvia_device_commands(device_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sylvia_commands_device_status ON public.sylvia_device_commands(device_id,status,created_at ASC);

ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datastream_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sylvia_device_commands ENABLE ROW LEVEL SECURITY;
