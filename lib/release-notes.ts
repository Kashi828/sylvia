export const CURRENT_RELEASE = '0.64.1';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Hardware Path Correctness',
  summary: 'SYLVIA v0.64.1 closes the real-device telemetry path gap by evaluating persistent alerts, failing closed on database persistence errors, and recording durable telemetry receipt events.',
  changes: [
    {
      title: 'Physical hardware acceptance',
      items: [
        'Connectivity verification now checks the authenticated device protocol handshake before telemetry and command tests.',
        'REST telemetry now enforces registered datastream ownership and declared value types, matching the MQTT ingestion contract.',
        'The v0.64 acceptance sequence is cloud → device → handshake → datastream → telemetry → heartbeat → command → ACK.',
        'Power-cycle, reconnect, MQTT failure and REST-poll fallback remain explicit acceptance tests.'
      ]
    },
    {
      title: 'Production runbook',
      items: [
        'Added docs/PRODUCTION-ACCEPTANCE-v0.64.md with cloud, hardware, recovery and project-isolation checklists.',
        'v1.0 remains gated by successful real-device acceptance rather than version number alone.'
      ]
    },
    {
      title: 'Build & console stability',
      items: [
        'Fixed the release-notes JSX boundary that could stop the production build at app/page.tsx.',
        'Aligned console copy with the current v0.62 cloud architecture instead of legacy milestone wording.',
        'Release visibility remains version-aware and automatically reappears on the next platform version.'
      ]
    },
    {
      title: 'Project isolation',
      items: [
        'Automations and schedules now enforce Builder permissions against the selected project instead of the legacy default project.',
        'Project-scoped API, device, datastream, telemetry, alert, notification and audit boundaries remain the v0.62 foundation.'
      ]
    },
    {
      title: 'Cloud readiness',
      items: [
        'Health reports REST readiness, realtime MQTT readiness, schema completeness and production secret requirements separately.',
        'The required schema includes workspace_projects for the v0.62 project-isolation migration.',
        'Vercel deployment verification remains a release gate rather than being treated as successful without a successful build.'
      ]
    },
    {
      title: 'Hardware acceptance',
      items: [
        'ESP8266/NodeMCU remains the primary physical acceptance target.',
        'The v0.63 gate is register → authenticate → heartbeat → telemetry → command → ACK → automation/alert.',
        'Power-cycle, reconnect, MQTT failure and REST-poll fallback tests remain required before v1.0.'
      ]
    },
    {
      title: 'Next milestone',
      items: [
        'v0.64 should focus on real hardware acceptance and production runbook validation rather than another large architectural rewrite.',
        'v1.0 remains gated by reproducible builds, applied migrations, security verification and successful physical-device acceptance.'
      ]
    }
  ]
} as const;