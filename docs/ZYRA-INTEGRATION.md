# SYLVIA × ZYRA AI

SYLVIA provides the connected-device and automation layer for the ZYRA AI ecosystem. ZYRA acts as an intelligence/agent layer that can discover devices, read telemetry, emit events, and enqueue commands.

## Contract

- `GET /api/v1/integrations/zyra/manifest` — capability discovery
- `GET /api/v1/devices` — device discovery
- `GET /api/v1/devices/:id` — device state
- `GET /api/v1/datastreams/:id` — datastream state
- `POST /api/v1/datastreams/:id/value` — write telemetry/value
- `POST /api/v1/integrations/zyra/emit` — emit agent/telemetry event
- `POST /api/v1/integrations/zyra/command` — queue an agent command

Authenticate with `Authorization: Bearer <device-or-project-token>`.
