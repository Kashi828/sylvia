# SYLVIA

SYLVIA — open IoT platform and Blynk alternative.

## Current baseline

**v0.51.0-beta.1 — Supabase Database Foundation**

The legacy database layer has been removed. SYLVIA now uses a fresh **Supabase PostgreSQL** database as its persistent backend.

## Database architecture

```text
Next.js / Vercel
       │
       │ POSTGRES_URL
       ▼
Supabase PostgreSQL
       │
       ├── users / projects / members
       ├── devices / datastreams
       ├── telemetry
       ├── device registry
       └── notifications / subscriptions
```

The application currently connects server-side through PostgreSQL. Supabase Auth and Realtime can be added later without changing the core device/MQTT architecture.

## New database setup

1. Create a new project at [Supabase](https://supabase.com/).
2. In Vercel, connect the Supabase integration to the SYLVIA project, or set the Supabase PostgreSQL connection as `POSTGRES_URL`.
3. Apply `supabase/migrations/20260917000000_sylvia_core.sql` to the new project.
4. Redeploy SYLVIA.
5. Open `/api/v1/health` and confirm the database reports `configured: true` and `connected: true`.

Do not commit database passwords, Supabase secret keys, or other credentials.

## Runtime environment

Required database variable:

```env
POSTGRES_URL=...
```

MQTT remains independent and continues to use the existing `SYLVIA_MQTT_*` variables.
