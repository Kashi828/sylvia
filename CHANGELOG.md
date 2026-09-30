# SYLVIA Changelog

## v0.66.0 — Academy Re-theme (ECT Design Language)

SYLVIA v0.66.0 re-themes the entire console in the ECT department-website design language: a complete colour, typography and element redesign with no behavior changes.

### Design language
- New `app/sylvia-academy.css` loads last and retargets the full `--ops-*` token system: navy `#152449`, navy-deep `#0C1830`, navy-soft `#1F3564`, gold `#C9A227`, gold-bright `#E8C766`, ivory `#F6F4EC`, paper `#FAF6EC`, ink `#16213B`, muted `#5B6478`, hairline `#DEDCD1`.
- Typography: Fraunces for page titles, KPI numerals, section heads, modal headings and empty states; Inter body; IBM Plex Mono for micro-labels, table headers, status bar, codes and the command palette.
- The top bar and command palette are navy gradient panels with the signature radial dot-grid texture and gold rules; the status bar is navy-deep with a 2px gold top border and mono uppercase labels.
- Signature elements: gold underline bars under card and section heads, mono eyebrow micro-labels with wide tracking, inset 3px gold active markers on the nav rail, circular gold-bordered icon chips, and hover elevation on white cards.

### Elements
- Primary buttons are gold with navy-deep uppercase mono text; secondary/ghost are hairline outlines; focus rings are gold.
- KPI tiles, cards, panels, stats and device rows are white on the ivory canvas with `#DEDCD1` hairlines; meters and chips keep green/amber/red tuned for light backgrounds.
- The command palette is a navy hero panel with gold group headings and highlighted rows; toasts are navy with a gold left rule; modals are white cards with a gold top rule over a navy-deep overlay.
- The older `--sylvia-*` and `--ui-*` token families and every hardcoded dark surface in the premium/console layers are retargeted to the academy palette; the API result box remains the single navy-deep code surface with green mono text.

### Correctness and accessibility
- Contrast rule: text-gold on light backgrounds uses `#A8861B`; gold-bright `#E8C766` is reserved for navy surfaces.
- Gold `:focus-visible` rings on all interactive elements; `prefers-reduced-motion` honored; selection color and scrollbars themed.
- Verified tab-by-tab with computed-style checks across all 18 console sections — zero unconverted dark surfaces.

### Release
- Platform version is now v0.66.0; Arduino SDK remains v0.53.8. The v0.65 ops shell, ⌘K palette, KPI overview and all v0.64 hardware-path behavior are unchanged.

## v0.65.0 — Ops Console Redesign

SYLVIA v0.65.0 replaces the marketing-style console with a compact, interactive operations surface built around the way an IoT fleet is actually operated.

### Application shell
- The console is now a fixed app shell: 48px command bar, icon navigation rail with hover tooltips, scroll-locked content column, and a persistent 26px status bar showing database state, online device count, stream/automation counts, transport, version and current role at all times.
- Navigation is a 56px icon rail; active sections are marked with a glowing accent indicator. The legacy stacked header and 18-label text sidebar are gone.

### Command palette
- `⌘K` / `Ctrl+K` opens a fuzzy-searchable command palette (26 actions: register device, new datastream/template/automation/API key, run hardware verification, sign in, and direct navigation to every section) with live filtering and Escape-to-close.
- The top-bar search field opens the same palette.

### Overview rebuild
- The marketing hero is replaced by a dense ops dashboard: four clickable KPI tiles (online devices, datastreams, automations, hardware acceptance status) and a two-column device list + live fabric-status card that polls `/api/v1/health` every 10 seconds.
- Device rows show temperature, battery meters and online state inline; KPIs navigate to their sections.

### Design system
- New `app/sylvia-redesign.css` (loaded last) defines the full token system: `--ops-*` colors, compact radii, mono numerics, chips, dense tables, event streams, and unified buttons/inputs/modals/toasts.
- Every legacy console surface (panels, stats, cards, stream tables, device control center, gauges, event/notification/alert centers, release notes) is restyled onto the new system without changing component behavior.
- Standalone pages (`/fleet`, `/groups`, `/bulk-operations`, `/telemetry/analytics`, `/notifications/providers`) inherit the same tokens; the legacy `ClientUIEnhancer` DOM injector is disabled so React owns the whole shell.

### Release
- Platform version is now v0.65.0; Arduino SDK remains v0.53.8. All v0.64.x hardware-path and console-access behavior is unchanged.

## v0.64.2 — Console Access & UI Completion

SYLVIA v0.64.2 closes the console access gap and completes the workspace UI surface that v0.64.x hardware acceptance depends on.

### Console authentication
- The console header now exposes the existing persistent sign-in flow: a Sign in button opens a modal backed by `POST /api/auth/login`, and a signed-in user chip signs out through `POST /api/auth/logout`.
- Device registration has required a persistent session since v0.59, but no console UI ever called the auth endpoints; real-device onboarding was therefore impossible from the browser until this release.
- The signed-in chip displays the account name and workspace role; sign-out is a single click.

### Console UI completion
- Roughly ninety classes referenced by console components had no CSS at all (header actions, telemetry center, dashboard widgets, fleet, device groups, bulk operations, telemetry analytics, notification providers, schedules). All of them now have light and dark styling in `app/sylvia-console.css`.
- Standalone pages (`/fleet`, `/groups`, `/bulk-operations`, `/telemetry/analytics`, `/notifications/providers`) render outside the console layout and previously appeared unstyled on the dark body.
- Fixed the Settings tab runtime crash caused by an unimported `RotateCw` icon.
- Replaced stale `v0.51 BETA` / `v0.64.0` brand labels with the release version constant.
- The fleet dashboard now explains an authentication failure instead of reporting a generic request error.
- Added `scripts/audit-css.mjs` so console CSS coverage can be verified; the committed `package-lock.json` makes builds reproducible.

### Production identity readiness
- Production identity secrets (`SYLVIA_DEMO_PASSWORD`, `SYLVIA_API_KEY_SECRET`, `SYLVIA_DEVICE_TOKEN_SECRET`) are configured in the deployment environment, so `/api/v1/health` can now report `ready: true`.
- Readiness had reported `ready: false` with `identityEnv: []` since the identity model landed in v0.59; production logins and device-token HMAC verification were blocked until now.
- Fixed the owner sign-in path: `verifyCredentials` read snake_case credential fields from the camelCase owner record, so every owner login failed with 401 even with the correct password. Owner login now verifies against the production database end to end (login → session → project-scoped device list).

### Release
- Platform version is now v0.64.2; Arduino SDK remains v0.53.8.

## v0.64.1 — Hardware Path Correctness

SYLVIA v0.64.1 closes a production hardware-path gap discovered during the v0.64 acceptance review.

### Telemetry and alerts
- Numeric telemetry now evaluates the persistent PostgreSQL alert engine when the database is configured.
- REST telemetry now triggers the same persistent automation engine already used by MQTT telemetry.
- Authenticated REST telemetry now rejects unregistered datastream IDs and values that do not match the registered datastream type.
- Telemetry receipt is recorded as a durable `telemetry.received` device event on both REST and MQTT transport paths.
- MQTT heartbeat activity is also recorded in the durable device-event timeline.
- Database-backed telemetry ingestion no longer silently falls back to in-memory storage when persistence fails.

### Release
- Platform version is now v0.64.1; Arduino SDK remains v0.53.8.

## v0.64.0 — Hardware Acceptance & Production Runbook

SYLVIA v0.64.0 makes physical ESP8266/NodeMCU verification an explicit release gate.

### Hardware verification
- The Arduino SDK now blocks telemetry and command polling until the authenticated protocol handshake succeeds.
- The reference ESP8266 firmware and console-generated firmware now initialize the SDK before attempting Wi-Fi, allowing recovery when Wi-Fi is unavailable during boot.
- A Wi-Fi reconnect invalidates the handshake and requires renegotiation before normal hardware polling resumes.
- Added authenticated protocol-handshake verification to the Connectivity acceptance sequence.
- Verification now runs cloud → device → handshake → datastream → telemetry → heartbeat → command acknowledgement.
- The existing safe identify command remains the first cloud-to-device command test.
- Power-cycle, reconnect, MQTT failure and REST-poll fallback remain required acceptance tests.

### Documentation
- Added `docs/PRODUCTION-ACCEPTANCE-v0.64.md` with the reproducible hardware and production acceptance checklist.
- v1.0 remains gated by real hardware acceptance, project isolation, recovery testing and security verification.

### Platform
- Platform version is now v0.64.0; Arduino SDK remains v0.53.8.

## v0.63.0 — Stabilization & Production Acceptance

SYLVIA v0.63.0 consolidates the v0.62 project-isolation foundation and fixes the immediate console/API issues found during production build verification.

### Build & console stability
- Fixed the release-notes JSX boundary in `app/page.tsx` that caused a Turbopack parse failure.
- Aligned console copy with the current v0.62 cloud architecture.
- Kept the version-aware "What's new" dialog so each release is surfaced once and returns on the next version.

### Project authorization
- Automations and schedules now enforce Builder permissions against the selected project instead of the legacy default project.
- Project-scoped API, device, datastream, telemetry, alert, notification and audit boundaries remain in place.

### Production acceptance
- Health continues to report REST readiness, realtime MQTT readiness, schema completeness and production secret requirements separately.
- Vercel build verification remains an explicit release gate.
- Real ESP8266/NodeMCU acceptance remains required before v1.0.

## v0.62.0 — Project Isolation Foundation


SYLVIA now establishes a persistent project boundary across the control plane while keeping the existing default workspace compatible.

### Project registry
- Added persistent `workspace_projects` registry with active/archived state and project membership lookup.
- Added authenticated `GET/POST /api/v1/projects` for project discovery and creation.
- Requests can select the active project with `X-SYLVIA-Project`.

### Resource isolation
- Persistent devices, device events, datastreams, telemetry, API keys, automations, schedules, alert rules, alert events, deliveries, audit history and automation runs are scoped to the active project.
- Existing default-workspace data is migrated to `sylvia-local-workspace`.
- Machine API keys are bound to their project and must present the matching project context.

### Release visibility
- Added a version-aware "What's new" dialog in the main console.
- The current release notice opens automatically once per browser storage key and is marked seen after opening.
- The notice can be reopened manually from the header; it automatically returns when the platform version changes.

### Platform
- Platform version is now v0.62.0; Arduino SDK remains v0.53.8.

## v0.61.0 — Durable Audit Log

SYLVIA now records privileged security and control-plane actions in PostgreSQL for operational review.

### Audit trail
- Added durable `audit_events` storage with actor, action, resource, metadata, IP address, user agent and timestamp.
- Login success/failure and logout events are recorded.
- Workspace member invitations, role changes and removals are recorded.
- Project API-key creation and revocation are recorded.
- Device-token rotation/revocation and device command dispatch are recorded.
- Added Admin-session-only `GET /api/v1/audit` for filtered audit history.
- Audit logging is best-effort and does not block the primary operation when audit storage is unavailable.

### Platform
- Platform version is now v0.61.0; Arduino SDK remains v0.53.8.
## v0.60.0 — Device Token Lifecycle

SYLVIA now supports revocable and rotatable hardware credentials without deleting or recreating the device.

### Device security
- Added token generation, revocation, rotation timestamp and last-authenticated tracking to the persistent device registry.
- Revoked device tokens stop authenticating REST telemetry, heartbeat and command-poll requests immediately.
- Token rotation invalidates the previous token and returns the replacement secret only once.
- Added `/api/v1/devices/{id}/token` for token status, rotation and revocation.
- Production deployments now require `SYLVIA_DEVICE_TOKEN_SECRET` for hardware-token HMAC signing.

### Cloud readiness
- Health now includes the v0.60 device token secret in production readiness checks.
- Platform version is now v0.60.0; Arduino SDK remains v0.53.8.
## v0.59.0 — Persistent Identity & Workspace Roles

SYLVIA now keeps user identities, sessions, and workspace membership in PostgreSQL instead of relying on process memory.

### Identity
- Added durable `app_users` and `app_sessions` tables.
- Password verification uses per-user salts with Node.js `scrypt`.
- Session cookies contain random tokens while PostgreSQL stores only SHA-256 token hashes.
- Sessions expire after 7 days and can be revoked on logout.
- Production deployments require `SYLVIA_DEMO_PASSWORD` and `SYLVIA_API_KEY_SECRET`.

### Workspace authorization
- Added durable `workspace_members` records with Owner, Admin, Builder and Viewer roles.
- Added `/api/v1/members` for authenticated membership listing, invitations, role changes and removal.
- Device registration requires Builder access or higher.
- API key creation/revocation requires Admin access or higher.
- Automation, schedule and session-based device-command mutations require Builder access or higher.
- Project API keys remain available for machine-to-machine cloud control.

### Console
- Workspace members are loaded from the persistent membership API instead of seeded local demo collaborators.
- Signed-in role is taken from the authenticated session.
- Platform shell is now v0.59.0; Arduino SDK remains v0.53.8.
## v0.58.0 — Persistent Alerting

SYLVIA now stores alert rules, alert events and webhook deliveries in PostgreSQL and evaluates numeric telemetry against workspace-scoped rules.

### Alert engine
- Added persistent alert rules with threshold, severity, cooldown and webhook actions.
- Alert cooldown claims are performed atomically before an alert event is created.
- Alert creation verifies device ownership and datastream ownership.
- Alert acknowledgements clear the active rule state.

### Notifications
- Notification Center can source alert and webhook activity from durable alert tables.
- Alert and delivery APIs are authenticated and workspace-scoped.

### Cloud path
- REST and MQTT numeric telemetry now evaluate both cloud automations and persistent alerts.
- Health readiness now checks the automation, schedule, project-key and alert tables.

### Platform
- Platform version is now v0.58.0; Arduino SDK remains v0.53.8.

## v0.57.0 — Project API Security

SYLVIA now has persistent project API credentials and a default-safe command boundary for cloud-to-hardware control.

### Project API keys
- Added durable `project_api_keys` storage with hashed secrets.
- API key creation returns the full secret only once.
- Added revocation and last-used tracking.
- Cloud-control APIs now accept either the authenticated session or a scoped project API key.

### Hardware command safety
- Added a default allowlist for `restart`, `sync`, `identify` and `digital_write`.
- `digital_write` validates GPIO 0-16 and binary output values.
- Custom commands are opt-in through `SYLVIA_ALLOW_CUSTOM_COMMANDS=true`.

### Platform
- Platform version is now v0.57.0; Arduino SDK remains v0.53.8.
## v0.56.0 — Cloud Automation Engine

SYLVIA reaches the cloud automation milestone with durable telemetry rules, schedules, and execution history.

### Automation
- Persistent telemetry rules can create events or dispatch real device commands.
- Rule cooldowns are claimed atomically in PostgreSQL to reduce duplicate triggers.
- Device ownership is enforced before automated command dispatch.

### Scheduling
- Persistent schedules support local day, time, timezone, and command payloads.
- Manual schedule execution is available from the console.
- Scheduled executions use a deterministic execution key to prevent duplicate runs.
- A secured `/api/cron/automations` worker evaluates due schedules and refreshes stale fleet state; the repository invokes it from GitHub Actions every 5 minutes.

### Console
- Automations and Schedules now use the cloud APIs instead of local-only demo actions.
- Durable automation run history is visible in the console.
- The platform shell is v0.56.0 while the Arduino SDK remains v0.53.8.

## v0.55.0 — Fleet Reliability

- Added owner-scoped fleet health and durable device event history.
- Added hardware diagnostics and stale-device lifecycle handling.
- Added durable command acknowledgement activity to the hardware event path.

## v0.54.0 — Physical Hardware Foundation

- Added explicit device ownership to the persistent registry.
- Added durable device events for heartbeat, telemetry and command dispatch activity.
- Added an authenticated hardware diagnostics endpoint for the first physical-device validation.
## v0.53.10 — Persistent Command Authority

SYLVIA now treats the PostgreSQL persistent command record as the authoritative cloud command state whenever the database is configured.

### v0.53.10 correctness follow-up
- Aligned all persistent command queries and health-schema checks with the canonical `device_commands` migration table.
- Kept base cloud health REST-ready when MQTT is optional; realtime readiness remains reported separately.
- Tightened command-state transitions so a command must move from `queued` to `sent` before MQTT publish.
- Aligned the Arduino runtime-reported SDK version with the published v0.53.8 SDK metadata.
- Fixed null termination in EEPROM-backed command recovery strings.

### Command delivery
- Generates command IDs through the persistent command layer.
- Rejects dispatch when a persistent command record cannot be created.
- Marks a persistent command `sent` before MQTT publish to prevent a successful publish from remaining visible as `queued`.
- Returns failed MQTT publishes to `queued` safely for REST polling.
- Clears stale send/ack/result fields when a command is requeued.

### Reliability boundary
This removes the cloud-side MQTT/REST duplicate-execution race caused by a publish succeeding while the persistent state transition fails.

### Versioning
The cloud platform is v0.53.10. The Arduino SDK remains v0.53.8 because this release does not require a firmware protocol change.

## v0.53.9 — MQTT Session Resilience

SYLVIA now treats the cloud MQTT broker as an observable session rather than a simple connected/disconnected socket.

### MQTT reliability
- Automatically restores telemetry, heartbeat, and command-ACK subscriptions after broker reconnects.
- Exposes connection count and reconnect count.
- Exposes last connect/disconnect timestamps and the most recent MQTT error.
- Waits for subscription restoration before reporting realtime readiness.
- Prevents an immediate post-reconnect command from racing ahead of ACK subscription recovery.

### Console and health
- Health now requires the MQTT subscription set to be restored before `realtimeReady` becomes true.
- Connectivity verification surfaces the MQTT session count.

### Hardware target

REST device session resilience from v0.53.8 and cloud MQTT session resilience now share an explicit reconnect/recovery model.

## v0.53.7 — Persistent Command Recovery

SYLVIA now preserves the latest device command outcome across ESP8266/ESP32 reboots and can recover an unacknowledged command without executing the hardware handler twice.

### Device reliability
- Added an EEPROM-backed command snapshot for the last command and result.
- Persists pending command acknowledgement state.
- Performs one recovery-aware command poll after boot using the persisted command ID.
- Re-acknowledges a still-pending cloud command when the same command was already executed before reboot.
- Reports command persistence and recovery state through heartbeat diagnostics.
- EEPROM persistence writes are change-aware to avoid unnecessary ACK-retry flash writes.

### Cloud
- REST command polling accepts an explicit recovery command ID.
- Recovery can retrieve a matching `sent` command without re-creating it.
- Stale-command cleanup does not fail the command explicitly being recovered.

### Console
- Device Control Center shows command persistence and recovery diagnostics.
- Handshake advertises `persistent_command_recovery`.

### Reliability boundary

This prevents duplicate execution when an already-completed hardware action loses its acknowledgement or the device reboots before the cloud sees the acknowledgement. A hard power loss during the physical action itself cannot provide a universal exactly-once guarantee.

### Hardware target

NodeMCU/ESP8266 → Wi-Fi → TLS → protocol handshake → persistent recovery → heartbeat → telemetry → command → GPIO/relay → ACK

## v0.53.6 — Device Protocol Handshake

SYLVIA now negotiates the device/cloud protocol before normal hardware polling.

### Handshake
- Added authenticated `GET /api/v1/devices/{id}/handshake`.
- Negotiates protocol version and REST-poll transport.
- Returns supported hardware capabilities.
- Rejects unauthenticated devices without exposing protocol metadata.

### Arduino SDK
- Stable SDK version is v0.53.6.
- Automatically retries the handshake every 10 seconds until successful.
- Exposes `handshake()` and `handshakeComplete()`.
- Reports negotiated protocol, transport, and capabilities in heartbeat state.
- Keeps existing heartbeat, telemetry, command polling, ACK retry, and idempotent execution behavior.

### Console
- Device Control Center now shows protocol, transport, and capability diagnostics.
- Connectivity Center firmware generator is aligned to v0.53.6 and the current SDK API.

### Hardware target

NodeMCU/ESP8266 → Wi-Fi → TLS → protocol handshake → heartbeat → telemetry → command → GPIO/relay → ACK

## v0.53.5 — Command Outcome Observability

SYLVIA now carries the most recent command outcome in the device heartbeat, making cloud-side troubleshooting easier during hardware control.

### Device telemetry
- Reports the last command ID.
- Reports whether the last command succeeded.
- Reports the last command result message.
- Existing SDK version, uptime, and Wi-Fi diagnostics remain available.

### Console
- Device Control Center displays the most recent command outcome alongside hardware diagnostics.

### Hardware target
A physical NodeMCU test can now correlate a dashboard command with the device-reported execution result.

## v0.53.4 — Idempotent Command Execution

This release hardens command handling for real hardware networks where an acknowledgement can be delayed or lost.

### Command reliability
- Command IDs are idempotent within a device runtime.
- A redelivered command replays the original success/failure result instead of executing the hardware action twice.
- Failed GPIO validation remains a failed command outcome.
- Persistent cloud command lifecycle stays aligned with the device acknowledgement.

### Hardware target
The next physical validation can safely exercise command retries without turning one cloud command into multiple hardware actions.

## v0.53.3 — Hardware Diagnostics Console

The SYLVIA console now turns device heartbeat diagnostics into a dedicated hardware view.

### Diagnostics
- Displays SDK version reported by the device.
- Displays Wi-Fi RSSI.
- Displays device uptime.
- Shows realtime connection state beside the hardware diagnostics.

### Device path
NodeMCU/ESP8266 → Sylvia SDK heartbeat → realtime state stream → Device Control Center.

### Next
Proceed with the physical NodeMCU test using the v0.53.3 flash runbook.

## v0.53.2 — Device Observability

The device heartbeat now carries built-in diagnostics for field troubleshooting.

### Device diagnostics
- Reports SDK version automatically.
- Reports device uptime in milliseconds.
- Reports Wi-Fi RSSI.
- Keeps application-reported state alongside the built-in diagnostics.

### Verification target
These fields appear in the existing realtime device state stream, making the first physical hardware test easier to diagnose without extra endpoints.

## v0.53.1 — Stable Hardware Connectivity

This release starts the stable numbered hardware track. The previous alpha labels remain in the historical changelog below.

### Cloud readiness
- Added a REST-first readiness signal so REST/HTTPS hardware does not depend on MQTT being configured.
- Kept MQTT readiness visible as a separate realtime capability.
- Hardware verification now stops at the first blocking prerequisite.

### Hardware verification
- Telemetry verification requires at least one persisted sample.
- Heartbeat verification requires a fresh online heartbeat.
- Command verification requires a persistent command acknowledgement.
- The complete sequence is cloud → device → datastream → telemetry → heartbeat → command.

### Arduino SDK
- Stable SDK line: v0.53.1.
- HTTPS-only startup with Root CA validation.
- Bounded HTTP timeout.
- Controlled command ACK retry.
- Outcome-aware command handlers.
- Reference GPIO safety boundary on RELAY_PIN.

### Tooling
- Automated ESP8266 Arduino compile workflow.
- Reproducible NodeMCU flashing runbook.
- Connectivity Center generates firmware using the official Sylvia SDK.

### Hardware target

NodeMCU/ESP8266 → Wi-Fi → TLS → SYLVIA Cloud → heartbeat → telemetry → dashboard command → GPIO/relay → ACK.

## v0.53.0-alpha.8 — Reproducible Hardware Flash Gate

The first physical-device milestone now has a repeatable repository runbook and an automated ESP8266 compile gate.

### Developer tooling
- Added `.github/workflows/arduino-ci.yml` to compile the official ESP8266 Cloud Test example with Arduino CLI.
- Added `docs/HARDWARE_ALPHA_FLASH.md` with cloud preparation, Arduino IDE setup, TLS, flashing, serial expectations, and the success condition.

### Next gate
- Flash one physical ESP8266/NodeMCU and verify the full cloud-to-GPIO-to-ACK loop.

# SYLVIA Changelog

## v0.53.0-alpha.6 — Physical Device Verification Gate

The hosted verification flow is now a strict readiness gate and the generated ESP8266 firmware matches the official SDK example.

### Verification
- Checks execute in order: cloud → device → datastream → telemetry → heartbeat → command acknowledgement.
- Verification stops on the first blocking failure.
- A queued command is no longer treated as a hardware verification pass.

### Firmware parity
- Connectivity Center generated firmware uses the official Sylvia SDK.
- Generated firmware includes TLS/Root CA sanity checks, Wi-Fi timeout protection, and bounded HTTP timeout.
- Reference GPIO control remains restricted to RELAY_PIN.

### Next gate
- Flash one physical ESP8266/NodeMCU and validate the complete cloud-to-GPIO-to-ACK loop.

## v0.53.0-alpha.5 — Hardware Safety Gate

The first-flash reference path now rejects GPIO commands aimed at pins other than its configured relay pin. This keeps the physical test focused on one known actuator while the cloud command contract remains extensible.

### Safety
- Reference ESP8266 firmware restricts digital_write to RELAY_PIN.
- The hosted Connectivity Center generates the same guarded behavior.
- Command acknowledgements reflect the handler's true success/failure result.

### Next gate
- Flash one physical ESP8266/NodeMCU and verify heartbeat, telemetry, identify, GPIO control, and ACK end-to-end.

## v0.53.0-alpha.4 — First Physical Device Gate

The hardware SDK is now outcome-aware and the hosted Connectivity Center generates the same official SDK path used by the repository example.

### SDK reliability
- Command handlers return `bool` so hardware failures produce failed acknowledgements instead of false success.
- HTTPS requests have bounded timeouts.
- Failed command acknowledgements are retried at a controlled interval.
- Startup requires HTTPS and a configured Root CA.
- SDK exposes HTTP and error diagnostics.

### Hardware path
- Connectivity Center generates `#include <Sylvia.h>` firmware.
- ESP8266 example includes Wi-Fi timeout and TLS configuration checks.
- Platform, health endpoint, SDK, and hardware example are version-aligned.

### Next gate
- Flash one physical ESP8266/NodeMCU and verify heartbeat, telemetry, command, GPIO action, and acknowledgement end-to-end.

## v0.53.0-alpha.2 — Hardware Alpha Flash Gate

The project enters the hardware-alpha track with the v0.53.0-alpha.3 validation toolkit.

### Cloud
- Platform package version moved to v0.53.0-alpha.3.
- Health endpoint now exposes the hardware-alpha version and deployment marker.
- Persistent device, datastream, telemetry, heartbeat, and command paths remain the cloud control plane.

### Arduino SDK
- SDK version: 0.3.0-alpha.2.
- Numeric, Boolean, and String telemetry now carry the canonical `datastreamId`.
- Added HTTP status and SDK error diagnostics.
- Added a bounded HTTPS timeout configuration.
- Added controlled retry for failed command acknowledgements.
- Added secure-first startup: HTTPS and a Root CA are required.
- Added ESP8266 cloud test example and SDK documentation.

### Hardware Alpha Target

ESP8266/NodeMCU → Wi-Fi → TLS → SYLVIA Cloud → heartbeat → telemetry → command → GPIO/relay → acknowledgement.

The next gate is the first physical ESP8266/NodeMCU cloud connection and GPIO control test.
