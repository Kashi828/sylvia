# SYLVIA Changelog

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
