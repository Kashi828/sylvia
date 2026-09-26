# SYLVIA Arduino SDK v0.53.8

Official SYLVIA cloud SDK v0.53.8 for ESP8266 and ESP32.

## Install

1. Install the ESP8266 or ESP32 board package in Arduino IDE.
2. Install ArduinoJson.
3. Install the Sylvia library from the arduino/Sylvia folder.
4. Open File → Examples → Sylvia → ESP8266_Cloud_Test.
5. Fill in Wi-Fi, device ID, token, SYLVIA URL, datastream ID, and production Root CA.
6. Flash the board.

## Cloud capabilities

- Authenticated HTTPS heartbeat
- Authenticated telemetry
- Persistent command polling
- Command acknowledgement
- identify, sync, and custom command handlers with success/failure ACKs
- GPIO command handling in the example, restricted to its configured relay pin
- Device state reporting
- ESP8266 and ESP32

## Security

Do not use setInsecure() on production devices. Keep device tokens secret and never commit real credentials.

## Hardware v0.53.1 flow

Arduino → Wi-Fi → HTTPS/TLS → SYLVIA Cloud → heartbeat → telemetry → command → GPIO action → acknowledgement

## Command handlers

Command callbacks return `bool`. Return `true` only after the hardware action succeeds; return `false` when validation or execution fails. SYLVIA sends the result through the persistent command acknowledgement.

```cpp
bool handleDigitalWrite(JsonObjectConst payload) {
  // validate and perform the hardware action
  return true;
}

sylvia.onCommand("digital_write", handleDigitalWrite);
```

## Command delivery semantics

Command IDs are idempotent within the device runtime. If the same command is delivered again because an earlier acknowledgement was lost, the SDK re-sends the original success/failure result instead of executing the hardware action again.


## Protocol handshake

v0.53.6 performs an authenticated startup handshake against `/api/v1/devices/{id}/handshake`.

The cloud returns:
- protocol version
- active transport
- supported device capabilities

The SDK exposes `handshake()` and `handshakeComplete()` and automatically reports the negotiated protocol, transport, and capabilities in the heartbeat state.

## v0.53.6 hardware path

Wi-Fi → HTTPS/TLS → protocol handshake → heartbeat → telemetry → command poll → GPIO action → ACK


## Persistent command recovery

v0.53.7 stores the last command result and pending acknowledgement in the device's EEPROM-backed SDK snapshot on ESP8266 and ESP32.

After reboot, the SDK makes one recovery-aware command poll using the persisted command ID. If that command is still non-terminal in the cloud, SYLVIA returns it to the device and the SDK re-acknowledges the saved result without executing the hardware handler again.

This prevents duplicate execution after a completed hardware action when the acknowledgement was lost or the device rebooted before the acknowledgement could be confirmed. A hard power loss during the physical action itself cannot provide a universal exactly-once guarantee.

## v0.53.7 hardware path

Wi-Fi → HTTPS/TLS → protocol handshake → persistent recovery check → heartbeat → telemetry → command poll → GPIO action → ACK


## Wi-Fi session recovery

v0.53.8 treats every Wi-Fi reconnect as a new SYLVIA connection session.

On reconnect the SDK:
- invalidates the previous handshake
- re-negotiates protocol and capabilities
- re-enables reboot/command recovery
- resets heartbeat, ACK retry, and command polling timers
- reports a Wi-Fi session counter through heartbeat diagnostics

This keeps cloud state from depending on a stale pre-disconnect transport session.


## Cloud MQTT session resilience

The v0.53.9 cloud release restores the MQTT telemetry, heartbeat, and command-ACK subscriptions whenever the broker reconnects. The v0.53.10 cloud release makes the persistent command record authoritative before MQTT publish. The Arduino REST SDK remains compatible and continues to use its v0.53.8 reconnect/session behavior.
