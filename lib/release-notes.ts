export const CURRENT_RELEASE = '0.68.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Acceptance Harness & Hardware-Path Fixes',
  summary: 'SYLVIA v0.68.0 adds an automated pre-hardware acceptance harness and fixes three blocking defects it immediately uncovered. Cloud-to-device commands had never worked: the durable command table was still the legacy UUID schema, so every command insert failed and the endpoint answered 503. Device registration had a column/value mismatch that rejected every new device. Devices could not be decommissioned at all. With those fixed, all 40 software gates of the v1.0 acceptance runbook pass against a live deployment.',
  changes: [
    {
      title: 'Critical: cloud-to-device commands never worked',
      items: [
        'The durable command table was never part of the v0.54+ text-ID reconciliation and was still the legacy UUID schema — id and device_id were uuid columns with a foreign key into an unused, empty devices table, and its status check allowed a different vocabulary entirely.',
        'Every command insert therefore failed with "invalid input syntax for type uuid". lib/persistent-commands.ts swallowed that error in a bare catch and returned null, so the command endpoint answered 503 "Persistent command storage unavailable" and no command could ever reach a device.',
        'Migration 20260928000000 rebuilds public.device_commands as a text-ID table matching what the runtime actually writes: cmd_<epoch>_<rand> command ids, <epoch><rand> device ids, and queued / sent / acked / failed statuses. The destructive rebuild asserts the table is empty first and refuses to run otherwise.',
        'This was the single largest obstacle to the v1.0 gate: acceptance runbook section 6 requires a command to reach acked, which was unreachable for every device since the command queue was introduced.'
      ]
    },
    {
      title: 'Critical: device registration was rejected',
      items: [
        'The device_registry insert listed fourteen columns but supplied fifteen values — the device type never had a column slot, so registering any device failed with "INSERT has more expressions than target columns".',
        'This made step 2 of the acceptance runbook impossible: no physical ESP8266 could be onboarded, because the device could not be created in the first place.',
        'The column list now includes type and the parameter order matches the placeholders exactly.'
      ]
    },
    {
      title: 'Devices can now be decommissioned',
      items: [
        'There was no way to remove a device from the cloud at all — the API exposed only GET, so retiring hardware meant leaving it registered forever.',
        'DELETE /api/v1/devices/{id} now removes a device, scoped to the owning project and requiring a Builder-or-above session so one workspace can never delete another workspace hardware.',
        'Datastreams and the durable command queue are removed with the device; telemetry history is deliberately retained for reporting. Every deletion is written to the audit log.'
      ]
    },
    {
      title: 'Automated pre-hardware acceptance harness',
      items: [
        'New scripts/device-acceptance.mjs (npm run acceptance) drives the full acceptance runbook against a deployed instance using only the public REST API — exactly the calls a real ESP8266 makes — across all nine runbook sections plus cloud prerequisites.',
        'It provisions a probe device and datastream, authenticates by device token, verifies handshake and capability advertisement, checks heartbeat and telemetry persistence in PostgreSQL, drives a command through claim and ACK to acked, triggers an automation and an alert, exercises power-cycle recovery and REST fallback, and probes project isolation with negative credentials.',
        'It also asserts the negative paths a hardware test would otherwise miss: forged tokens are rejected, telemetry type mismatches and unregistered datastreams are refused, and a replayed ACK does not re-stamp an already-acked command.',
        'Exit code is non-zero when any gate fails, so it can gate CI or a release. --json writes a machine-readable acceptance record with device id, command id, automation run id, alert event id and timestamps; --keep leaves the probe device in place for inspection.',
        'New scripts/migrate.mjs applies a .sql migration statement-by-statement against the configured database, naming the exact statement on failure.'
      ]
    },
    {
      title: 'Shell and elements (Blynk console patterns)',
      items: [
        'Primary buttons are solid #00CA86 with white uppercase mono text; secondary and ghost variants are hairline outlines; focus rings are light green across all interactive elements.',
        'KPI tiles, cards, panels, stats and device rows are white on the ash canvas with #E2E6EB hairlines; meters and badges use Blynk semantic green/red/amber (#00873E, #D3435C, #ED9D00).',
        'The command palette is a white rounded search panel with green-faded highlighted rows; toasts are white with a green left rule; modals are white cards with a green top rule over a charcoal overlay.',
        'Legacy surfaces (event and notification centers, device control center, connection steps, API reference, ZYRA bridge) are retargeted onto the Blynk palette, including the older --sylvia-*, --ui-* and --acad-* token families; the API result box is the single dark charcoal code surface.'
      ]
    },
    {
      title: 'Console layout defects fixed at the source',
      items: [
        'The sidebar labels disappeared at tablet width because the 860px breakpoint both collapsed the rail to 48px and hid the labels, stranding them with nowhere to render. The rail now keeps its labels down to 640px and collapses to an icon-only rail only at 640px.',
        'The lead KPI tile collapsed to a 7px dot because globals.css defined an unscoped .pulse for the launch-page status dot that collided with the console KPI modifier. The launch dot is now .launchDot, so the collision cannot recur in any theme.',
        'Rail width is now a single --ops-rail-w token declared in sylvia-redesign.css, so theme layers restyle the grid without re-declaring every breakpoint. Breakpoint overrides are scoped to main.console-shell because media queries add no specificity and an unscoped theme rule would otherwise win on source order alone.',
        'Status bar telemetry ran off the right edge on narrow viewports; the lower-value items are now dropped at 860px and 560px instead of overflowing.',
        'All three breakpoints verified with computed-style and geometry probes: 1512px gives a 198px labeled rail with 19 labels, 820px a 170px labeled rail, and 390px a 52px icon rail with no labels, uniform KPI tiles and no horizontal scroll.'
      ]
    },
    {
      title: 'Release',
      items: [
        'Platform version is now v0.68.0; Arduino SDK remains v0.53.8.',
        'CURRENT_RELEASE was still reporting 0.67.0 after the v0.67.1 patch release; the in-console release notes now match the shipped version again.',
        'The remaining v1.0 gate item is physical ESP8266 actuation: flashing a board and confirming the pin moves. Everything else in the runbook is now verified automatically.'
      ]
    }
  ]
} as const;