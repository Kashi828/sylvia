# SYLVIA v0.64 Hardware Acceptance Runbook

v0.64.0 is the physical-device acceptance gate. It does **not** declare v1.0 readiness until a real ESP8266/NodeMCU completes the sequence below.

## Acceptance path

ESP8266/NodeMCU → Wi-Fi → HTTPS/TLS → device token authentication → protocol handshake → heartbeat → datastream → persisted telemetry → cloud command → physical command execution → ACK → automation/alert → reconnect / power-cycle recovery → REST-poll fallback

## 1. Cloud prerequisites

- [ ] Vercel deployment reports success.
- [ ] `/api/v1/health` returns `ready: true`.
- [ ] `restReady: true`.
- [ ] All required v0.54–v0.62 migrations are applied.
- [ ] `workspace_projects` exists.
- [ ] Production secrets are configured: `SYLVIA_DEMO_PASSWORD`, `SYLVIA_API_KEY_SECRET`, `SYLVIA_DEVICE_TOKEN_SECRET`.
- [ ] MQTT is optional for the first REST acceptance; if enabled, verify `realtimeReady`.

## 2. Provision one physical device

Use the console Connectivity page:

1. Register one ESP8266/NodeMCU device.
2. Create at least one persistent datastream.
3. Copy the device token once and store it securely.
4. Generate the firmware using the console's current firmware template.
5. Replace Wi-Fi credentials, SYLVIA base URL, device ID, token, datastream ID and Root CA.
6. Flash the board at 115200 baud.

Never commit the device token or Wi-Fi password.

## 3. Protocol handshake

The device must authenticate successfully against `GET /api/v1/devices/{id}/handshake`.

Expected: `ok: true`, `protocolVersion: 1`, `transport: rest-poll`, `sdkMinVersion: 0.53.8`.

The device should only proceed to normal polling after a successful handshake.

## 4. Heartbeat

Expected:
- [ ] device becomes `online`
- [ ] `lastSeen` continuously refreshes
- [ ] a `device.heartbeat` event is recorded
- [ ] firmware/state diagnostics are visible in the console

A heartbeat older than the console's acceptance threshold is a failure for the live-hardware gate.

## 5. Telemetry

Send a real sensor value through the registered datastream.

Verify:
- [ ] authenticated ingestion succeeds
- [ ] the sample is persisted in PostgreSQL
- [ ] the console shows the latest value
- [ ] `telemetry.received` is recorded
- [ ] the device continues sending values after reconnect

## 6. Command and ACK

Use the safe `identify` command first.

Then verify a controlled `digital_write` command only against the configured test GPIO/relay pin.

Expected:
1. command is created as persistent state
2. device claims the command
3. physical handler executes once
4. device posts ACK
5. cloud command becomes `acked`
6. `device.command.ack` event is recorded

A command that only reaches `queued` or `sent` is **not** a hardware acceptance pass.

## 7. Automation and alerts

After basic hardware control works:
- [ ] Create a numeric telemetry automation.
- [ ] Trigger it with a real sensor value.
- [ ] Verify an automation run is persisted.
- [ ] Verify the resulting command reaches the device and ACKs.
- [ ] Create a threshold alert.
- [ ] Trigger it with real telemetry.
- [ ] Verify an alert event and delivery record.

## 8. Recovery tests

### Wi-Fi reconnect
1. Disconnect Wi-Fi briefly.
2. Restore Wi-Fi.
3. Confirm the device reconnects without re-registration.
4. Confirm heartbeat resumes.
5. Confirm telemetry resumes.

### Power cycle
1. Remove device power.
2. Restore power.
3. Confirm the device re-authenticates with the same token.
4. Confirm heartbeat and telemetry resume.
5. If a command was pending before reboot, verify SDK recovery behavior does not execute it twice.

### MQTT failure
1. Make MQTT unavailable.
2. Keep HTTPS available.
3. Confirm REST polling continues to deliver commands.
4. Restore MQTT.
5. Confirm realtime readiness/subscriptions recover.

## 9. Project-isolation test

Create two projects.
- Register device A in project A.
- Register device B in project B.
- Confirm project A cannot list or control device B.
- Confirm a project-A API key cannot be used with project B.
- Switch projects in the console and verify resource lists change accordingly.

## 10. Final acceptance record

Record:
- deployment URL and commit SHA
- SYLVIA platform version
- SDK version
- device ID
- firmware version
- transport used
- timestamp of first heartbeat
- timestamp of first persisted telemetry
- command ID and final ACK status
- automation run ID
- alert event ID
- reconnect result
- power-cycle result
- REST fallback result
- project-isolation result

## v1.0 gate

v1.0 should only be declared after reproducible production build, all required migrations applied, production secrets verified, project isolation verified, real ESP8266/NodeMCU hardware accepted, command/ACK behavior verified, automation and alert paths verified, power-cycle/reconnect behavior verified, REST fallback verified, and no known blocking security or data-isolation defect.