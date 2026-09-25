# SYLVIA Changelog

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
