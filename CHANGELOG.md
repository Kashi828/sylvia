# SYLVIA Changelog

## v0.53.0-alpha.2 — Hardware Alpha Flash Gate

The project enters the hardware-alpha track.

### Cloud
- Platform package version moved to v0.53.0-alpha.1.
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
