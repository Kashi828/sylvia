export const CURRENT_RELEASE = '0.63.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Stabilization & Production Acceptance',
  summary: 'SYLVIA v0.63.0 consolidates the project-isolation foundation and hardens the console/API path for reproducible production acceptance.',
  changes: [
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