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
