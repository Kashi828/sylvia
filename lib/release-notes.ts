export const CURRENT_RELEASE = '0.69.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Project Isolation & Acceptance Integrity',
  summary: 'SYLVIA v0.69.0 hardens multi-project fleet visibility, aligns the software acceptance harness with the exact ESP8266 command/ACK contract, and makes the device-command reconciliation migration safe to record against an already-repaired production table.',
  changes: [
    {
      title: 'Project isolation',
      items: [
        'Fleet stale-device updates and returned device lists are now scoped to the authenticated selected project.',
        'The acceptance harness checks that Fleet can see the probe device through its selected project after project-scoped authorization.',
        'Existing device, datastream, telemetry, automation, alert, notification and audit boundaries remain project-scoped.'
      ]
    },
    {
      title: 'Hardware protocol integrity',
      items: [
        'The acceptance harness now ACKs through POST /api/v1/devices/{id}/commands, matching the current ESP8266 SDK.',
        'The software acceptance gate therefore exercises the same authenticated REST command/ACK contract used by the NodeMCU firmware.',
        'Physical GPIO actuation, reconnect and power-cycle behavior remain the final real-hardware gate.'
      ]
    },
    {
      title: 'Database reproducibility',
      items: [
        'The device_commands reconciliation migration is now idempotent: an already-correct production table is preserved.',
        'Incompatible non-empty command tables are never destructively rebuilt.',
        'The corrected migration is recorded in Supabase migration history while preserving existing acceptance records.'
      ]
    },
    {
      title: 'Release consistency',
      items: [
        'Package, lockfile, health marker, release notes and documentation now identify v0.69.0 consistently.',
        'A successful cloud build still does not count as physical hardware acceptance.'
      ]
    }
  ]
} as const;