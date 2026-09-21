# SYLVIA

SYLVIA — open IoT platform and Blynk alternative.

## Current baseline

**v0.52.0-beta.1 — REST Command Polling**

SYLVIA now has a persistent command path that can operate through MQTT or authenticated REST polling. The main console remains the single workspace for registering real hardware, device control, telemetry and automation.

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
       ├── persistent device commands
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

## Command transport

Device commands can now use either:

- **MQTT** — preferred live transport with QoS 1 and command acknowledgements.
- **REST polling** — authenticated ESP8266/NodeMCU devices can poll `GET /api/v1/devices/{id}/commands`, receive queued commands atomically claimed as `sent`, then acknowledge with `POST /api/v1/devices/{id}/commands`.

This gives hardware a cloud command path even when an MQTT client is not connected. Command records remain in PostgreSQL for acknowledgement history.

## Current beta progress

- Single SYLVIA console; the separate Hardware Beta console has been removed.
- Fake/demo devices and automatic simulator telemetry have been removed.
- Device registration now uses an authenticated server API and returns a device token for hardware setup.
- The console synchronizes hardware presence from the fleet registry.
- Persistent telemetry and persistent device metrics are supported.
- Persistent command queue and acknowledgement storage are supported.
- REST command polling is now available as a hardware transport fallback.
- ESP8266/NodeMCU support remains the next real-hardware validation path; physical hardware testing is intentionally manual.

### v0.52.0-beta.1

The command path now closes the REST fallback loop: queued commands can be atomically claimed by a device, marked as sent, and acknowledged by that same authenticated device. This is the next step toward reliable cloud-to-hardware control without requiring the MQTT session to stay connected.
