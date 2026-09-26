# SYLVIA

SYLVIA — open IoT platform and Blynk alternative.

## Current baseline

**v0.59.0 — Persistent Identity & Workspace Roles**

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

The application connects server-side through PostgreSQL. SYLVIA now persists application users, sessions and workspace memberships directly in the database while keeping the device/MQTT architecture independent.

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
- Persistent command state is authoritative before MQTT publish.
- REST command polling is available as a hardware transport fallback.
- v0.54.0 adds owner-scoped hardware diagnostics and durable device events.
- v0.55.0 adds fleet health and durable hardware activity tracking.
- v0.56.0 adds persistent telemetry automations, schedules, execution history, and a secured scheduler worker.
- v0.57.0 adds persistent project API keys, scoped cloud-control authentication, revocation, last-used tracking, and a default-safe hardware command policy.
- v0.58.0 adds persistent alert rules, alert events, acknowledgements, webhook delivery history, and durable notification sourcing.
- v0.59.0 adds persistent users, hashed session records, workspace membership, role enforcement, and production secret requirements.
- ESP8266/NodeMCU remains the primary physical validation target.

### v0.52.0-beta.2

The REST fallback is now accompanied by a real ESP8266 command-polling reference sketch. It polls the persistent command queue, executes `restart`, `sync`, `identify`, and `digital_write` commands, then acknowledges each command back to SYLVIA over authenticated HTTPS.

Reference firmware: `examples/esp8266/sylvia-rest-command-poller.ino`.

Command acknowledgements now distinguish successful and failed device execution, and terminal command records cannot be acknowledged twice. The ESP8266 reference also ignores a repeated command ID during the same runtime to reduce duplicate GPIO execution.\n\nThe next hardware milestone is a physical ESP8266/NodeMCU test using a real relay or LED load.


## v0.54.0 — Physical Hardware Foundation

The cloud/device boundary is prepared for real ESP8266/NodeMCU validation. Device ownership is explicit, fleet state is observable, durable device events record heartbeat, telemetry and command activity, and an authenticated diagnostics endpoint exposes the cloud-side hardware state.

## v0.55.0 — Fleet Reliability

Fleet health is owner-scoped and reports online, offline, provisioning and stale-device state. Recent durable device activity and telemetry volume are available for operational troubleshooting.

## v0.56.0 — Cloud Automation Engine

Telemetry can trigger persistent device commands or events. Clock-based schedules can issue persistent commands through MQTT or leave them queued for REST polling. Automation runs are retained in PostgreSQL, scheduled execution is deduplicated, and the automation worker evaluates due schedules every 5 minutes through GitHub Actions.


## v0.56.0 scheduler setup

The repository keeps the scheduler endpoint in the Next.js app but does not require a Vercel Cron entry. This avoids the deployment restriction on sub-daily Vercel Cron schedules for Hobby plans. The included GitHub Actions worker runs every 5 minutes and calls `/api/cron/automations`.

Configure two repository secrets before enabling scheduled execution:

- `SYLVIA_CRON_URL` — the full deployed URL ending in `/api/cron/automations`.
- `CRON_SECRET` — the same secret configured in the SYLVIA deployment environment.

The worker can also be started manually from GitHub Actions. Scheduled workflows can be delayed under load, so the scheduler evaluates schedules that are already due rather than requiring an exact minute match.


## v0.57.0 setup

Project API keys are stored as HMAC-SHA256 hashes and the full secret is returned only at creation time. Configure `SYLVIA_API_KEY_SECRET` in the deployment environment for an independent key-signing secret. The unified cloud-control APIs accept either the authenticated session cookie or a project key in `Authorization: Bearer <key>` or `X-SYLVIA-API-Key: <key>`.

The default hardware command policy allows `restart`, `sync`, `identify`, and `digital_write`. Set `SYLVIA_ALLOW_CUSTOM_COMMANDS=true` only when the connected device firmware intentionally supports additional commands.


## v0.58.0 alert setup

Apply `supabase/migrations/20260926000003_v058_persistent_alerts.sql` after the v0.57 migration. Alert rules are scoped to the owning workspace and selected device/datastream. Numeric telemetry from REST or MQTT is evaluated against the persistent rules, with cooldown claims performed in PostgreSQL before an event is created.


## v0.59.0 identity setup

Apply `supabase/migrations/20260926000004_v059_persistent_identity.sql` after the v0.58 migration.

Set these deployment environment variables:

```env
POSTGRES_URL=...
SYLVIA_DEMO_PASSWORD=your-owner-password
SYLVIA_API_KEY_SECRET=your-long-random-api-key-secret
# Optional:
SYLVIA_OWNER_EMAIL=owner@sylvia.local
SYLVIA_OWNER_NAME=SYLVIA Owner
```

On the first authenticated login, SYLVIA creates the owner account `usr_owner` and its `Owner` workspace membership when the persistent identity tables are available. The full session token is never stored in PostgreSQL; only its SHA-256 hash is stored.

Workspace roles are:

- **Owner** — full workspace control.
- **Admin** — members, API keys and workspace administration.
- **Builder** — device registration and cloud automation/device mutations.
- **Viewer** — read-only workspace access.

The first production login uses the owner credentials represented by `SYLVIA_OWNER_EMAIL` and `SYLVIA_DEMO_PASSWORD`.