## SYLVIA v0.50.0-beta.1

Hosted NodeMCU beta foundation: deployment health checks, persistent MQTT bridge, and end-to-end hardware smoke-test guidance.

# SYLVIA v0.40 Beta — Notification Provider Layer

SYLVIA remains an independent IoT platform. ZYRA is optional.

## New in v0.13
- MQTT.js cloud/client bridge
- MQTT broker status endpoint: `GET /api/v1/mqtt/status`
- Authenticated MQTT publish endpoint: `POST /api/v1/mqtt/publish`
- QoS 1 publishing with reconnect support
- Environment-configurable broker credentials
- Database-ready telemetry architecture from v0.12
- Production health endpoint reports DB + MQTT configuration

## Run
```bash
npm install
npm run dev
```

## MQTT environment
Copy `.env.example` to `.env.local` and configure your broker.

## Blynk-style device programming (v0.14)

SYLVIA now supports a first-class virtual-pin API for hardware developers.

```cpp
#define SYLVIA_TEMPLATE_ID "YOUR_TEMPLATE_ID"
#define SYLVIA_AUTH_TOKEN  "YOUR_DEVICE_TOKEN"

#include <WiFi.h>
#include <Sylvia.h>

Sylvia.begin(SYLVIA_AUTH_TOKEN, ssid, pass, "https://your-sylvia-host");

void loop() {
  Sylvia.run();
  Sylvia.virtualWrite(0, 25.4); // V0
}
```

This is a SYLVIA-native API rather than a Blynk compatibility shim.


## v0.17 Beta — State Sync
Command delivery now supports acknowledgements and device-authoritative state reporting. See `docs/V0.17_STATE_SYNC.md`.


## v0.32 Beta — Telemetry Alerts
Threshold rules, cooldowns, active alert state, event history and acknowledgement are now available through the Alerts workspace and REST API. See `V0.32_TELEMETRY_ALERTS.md`.


## v0.33 Beta — Alert Actions & Webhooks
Alert rules can now invoke outbound HTTP/HTTPS webhooks, with test delivery and delivery history. See `V0.33_ALERT_ACTIONS.md`.


## SYLVIA v0.34 Beta — Event Center
- Unified alert and webhook event timeline
- Severity and event-type filters
- Active alert and delivery counters
- Automatic 5-second refresh
- Webhook success/failure visibility
- Prepared for future persistent event history and push notifications


## v0.37 Beta
User/project notification subscriptions are available under the Subscriptions workspace.


## v0.40 Beta — Notification Provider Layer
- Provider abstraction for optional notification delivery channels
- Webhook, generic HTTP email, generic HTTP push, and local console adapters
- Provider test endpoint and delivery history
- Dedicated `/notifications/providers` workspace
- Provider layer is vendor-neutral; credentials should be managed by the hosting environment
- Delivery timeout and bounded in-memory history for beta operation

### Provider API
```text
GET    /api/v1/notifications/providers
POST   /api/v1/notifications/providers
DELETE /api/v1/notifications/providers?id=<id>
GET    /api/v1/notifications/providers?deliveries=1
POST   /api/v1/notifications/providers/test
```

## v0.40 Beta
Device authentication is hardened for hosted hardware testing. Device tokens are hashed server-side, compared in constant time, scoped to their device, and can be rotated through the device token endpoint. Set `SYLVIA_DEVICE_TOKEN_SECRET` in hosted deployments.


## v0.41 Beta — Persistent Device Registry
- Fleet/device lifecycle metadata is persisted in PostgreSQL when `DATABASE_URL` is configured.
- Registry survives application restarts and hydrates into the runtime fleet view.
- Online/offline lifecycle transitions and last-seen metadata are persisted.
- Memory fallback remains available for local/demo operation.
- Apply migrations with `npm run db:migrate`.



## v0.43
First-class NodeMCU/ESP8266 SDK is available under `sdk/esp8266`.

## v0.44
Secure provisioning and physical-device claiming foundation for the hosted NodeMCU beta. See `V0.44_SECURE_PROVISIONING.md` and `sdk/esp8266/Sylvia/`.


## v0.45 Beta
Real NodeMCU/ESP8266 MQTT telemetry ingestion with device-token validation and heartbeat presence updates. See `V0.45_REAL_HARDWARE_TELEMETRY.md`.


## v0.46 — Cloud-to-device commands

Cloud commands are now published to the device MQTT command topic when a broker is configured. The ESP8266 SDK acknowledges commands on the `command-ack` topic, allowing the server to close the in-flight command and record the acknowledgement. If MQTT is unavailable, commands remain in the existing queue for polling-based delivery.


## v0.49 Beta — End-to-End Hardware Hardening
The release freezes major feature work and adds hosted-beta preflight validation, MQTT TLS enforcement improvements, and a complete NodeMCU acceptance-test checklist. See `V0.49_END_TO_END_HARDENING.md`.


## v0.50 Beta — Hosted Hardware Beta
The hosted hardware beta milestone adds the Hardware Test Center at `/beta`, a cloud readiness preflight, and an explicit NodeMCU acceptance sequence. v0.50 is intended for controlled beta testing, not a production-stability claim. See `V0.50_HOSTED_HARDWARE_BETA.md`.
