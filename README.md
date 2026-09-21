# SYLVIA

SYLVIA — open IoT platform and Blynk alternative.

## Current baseline

**v0.51.0-beta.5 — Persistent Hardware Foundation**

SYLVIA now starts without seeded/fake devices. The main console is the single workspace for registering real hardware, device control, telemetry and automation.

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
4. Apply `supabase/migrations/20260920000000_persistent_device_auth.sql` as well when upgrading an existing database.
5. Apply `supabase/migrations/20260921000000_persistent_commands.sql` to enable persistent command queue and acknowledgement history.
6. Redeploy SYLVIA.
7. Open `/api/v1/health` and confirm the database reports `configured: true` and `connected: true`.

Do not commit database passwords, Supabase secret keys, or other credentials.

## Runtime environment

Required database variable:

```env
POSTGRES_URL=...
```

MQTT remains independent and continues to use the existing `SYLVIA_MQTT_*` variables.


## Current beta progress

- Single SYLVIA console; the separate Hardware Beta console has been removed.
- Fake/demo devices and automatic simulator telemetry have been removed.
- Device registration now uses an authenticated server API and returns a device token for hardware setup.
- The console synchronizes hardware presence from the fleet registry.
- Light-mode UI fixes are isolated from the established dark-mode theme.
- ESP8266/NodeMCU support remains the next real-hardware validation path; physical hardware testing is intentionally manual.


### v0.51.0-beta.5

The persistent command queue now has an explicit PostgreSQL schema, including command status, dispatch/ack timestamps, payload/result storage, and indexes for device command history.

Physical NodeMCU testing is intentionally the next manual validation step after the hosted MQTT broker and database are ready.
