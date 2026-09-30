# SYLVIA

SYLVIA — open IoT platform and Blynk alternative.

## Current baseline

**v0.66.0 — Academy Re-theme (ECT design language)**

SYLVIA has a persistent multi-project control plane: projects, membership, devices, datastreams, telemetry, automations, alerts, API keys, notifications and audit history are scoped to the active workspace project. The console is a compact operations surface — fixed shell with icon rail, ⌘K command palette, live status bar and dense device/fabric panels — backed by the persistent sign-in flow (`SYLVIA_DEMO_PASSWORD` owner account). Production identity secrets are required for `/api/v1/health` to report `ready: true`. Real ESP8266/NodeMCU validation remains the v1.0 acceptance gate.

## Physical hardware acceptance

Use [`docs/PRODUCTION-ACCEPTANCE-v0.64.md`](docs/PRODUCTION-ACCEPTANCE-v0.64.md) for the reproducible ESP8266/NodeMCU acceptance sequence, recovery tests, REST fallback and v1.0 gate.

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

## Database setup and upgrade path

1. Create or select the Supabase PostgreSQL project used by SYLVIA.
2. In Vercel, connect the Supabase integration to the SYLVIA project, or set the PostgreSQL connection as `POSTGRES_URL`.
3. For a fresh SYLVIA database, apply the core/runtime migrations through `20260923173759_sylvia_runtime_compatibility.sql`, then apply the v0.54–v0.62 migrations in timestamp order.
4. For the current hybrid database layout created by earlier SYLVIA releases, apply `20260927000000_legacy_runtime_schema_reconciliation.sql` before the v0.58/v0.62 migrations. This migration reconciles the empty legacy UUID-based alert/notification tables with the text-ID runtime schema.
5. Apply `20260927000001_runtime_index_hardening.sql` for the runtime foreign-key indexes.
6. Set the production secrets required by the current identity/device security model: `SYLVIA_DEMO_PASSWORD`, `SYLVIA_API_KEY_SECRET`, and `SYLVIA_DEVICE_TOKEN_SECRET`. `/api/v1/health` reports `identityReady: false` until all three are present.
7. Redeploy SYLVIA after any Vercel environment-variable change.
8. Open `/api/v1/health` and require `ready: true`, `restReady: true`, a connected database, and an empty `runtimeSchema.missingTables` list before hardware acceptance.

Do not commit database passwords, Supabase secret keys, device tokens, or other credentials.

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
- v0.60.0 adds device-token rotation, revocation, token-generation tracking, and production device-secret requirements.
- v0.61.0 adds a durable audit trail for authentication, workspace administration, API keys, device tokens and hardware commands.
- v0.62.0 adds persistent project registry, project selection, project-bound API keys, device/datastream/telemetry isolation, project-scoped automations/alerts/notifications, and authenticated workspace membership boundaries.
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

## v0.60.0 device token setup

Apply `supabase/migrations/20260926000005_v060_device_token_lifecycle.sql` after the v0.59 migration.

Set the production hardware credential secret:

```env
SYLVIA_DEVICE_TOKEN_SECRET=your-long-random-device-token-secret
```

Device tokens are HMAC-protected and are not stored in plaintext. Rotating a token immediately invalidates the previous token. Revoking a token disables the device credential without deleting the device, telemetry or command history.

`POST /api/v1/devices/{id}/token` with `{ "action": "rotate" }` returns the new token once. Use `{ "action": "revoke" }` to disable the current credential.


## v0.61.0 audit setup

Apply `supabase/migrations/20260926000006_v061_audit_log.sql` after the v0.60 migration. Admin users can review the resulting audit history through `GET /api/v1/audit`. Audit records include the actor type, action, affected resource, request metadata and timestamp; secrets and raw device/API tokens are not written to the audit metadata.
