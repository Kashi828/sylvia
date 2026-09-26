export const CURRENT_RELEASE = '0.62.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Project Isolation Foundation',
  summary: 'SYLVIA now has persistent project boundaries across the cloud control plane, preparing the platform for multi-project operation and a cleaner path toward v1.0.',
  changes: [
    {
      title: 'Projects & workspace',
      items: [
        'Persistent workspace project registry with active and archived states.',
        'Project selector in the main console with create-project support for authorized admins.',
        'Authenticated project membership is enforced for the selected project context.'
      ]
    },
    {
      title: 'Resource isolation',
      items: [
        'Devices, datastreams, telemetry, device events, API keys, automations, schedules, alerts, notifications, audit history and automation runs are project-scoped.',
        'Machine API keys are bound to their project and require matching project context.',
        'The existing default workspace remains the migration target for current data.'
      ]
    },
    {
      title: 'Security & identity',
      items: [
        'Persistent users, sessions and workspace roles continue from v0.59.',
        'Device-token rotation/revocation and durable audit logging continue from v0.60/v0.61.',
        'Application-layer authorization now checks the selected project before cloud operations.'
      ]
    },
    {
      title: 'Hardware cloud path',
      items: [
        'MQTT remains the preferred realtime path with REST polling as the hardware fallback.',
        'Persistent command queue, acknowledgement history, heartbeat and telemetry remain the core hardware boundary.',
        'ESP8266/NodeMCU is still the primary physical acceptance target.'
      ]
    },
    {
      title: 'Release readiness',
      items: [
        'v0.62.0 is an architecture milestone, not the final v1.0 stability gate.',
        'The next gate is migration/application verification, reproducible builds, and real hardware acceptance.',
        'The console continues to expose project context so future releases can add product-scale capabilities cleanly.'
      ]
    }
  ]
} as const;