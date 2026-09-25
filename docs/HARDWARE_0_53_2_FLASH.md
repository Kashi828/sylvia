# SYLVIA v0.53.2 Hardware Flash Runbook

## Target

Version: **v0.53.2**

Validate one ESP8266/NodeMCU against the deployed SYLVIA cloud using the official Sylvia Arduino SDK.

## 1. Cloud preparation

In the SYLVIA console:

1. Register an ESP8266/NodeMCU device.
2. Save the one-time device token.
3. Create at least one **Number** datastream for the device.
4. Open **Connectivity** and select the device.
5. Use **Run verification** after the physical device is online.

## 2. Arduino IDE

Install:

- ESP8266 board package
- ArduinoJson
- Sylvia library from `arduino/Sylvia`

Open:

`File → Examples → Sylvia → ESP8266_Cloud_Test`

## 3. Firmware configuration

Set:

```cpp
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* SYLVIA_BASE_URL = "https://YOUR_SYLVIA_DOMAIN";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";
const char* TELEMETRY_STREAM_ID = "YOUR_DATASTREAM_ID";
```

Paste the production server Root CA into `SYLVIA_ROOT_CA`.

Do **not** use `setInsecure()`.

## 4. Safe hardware test

The reference example uses:

```cpp
const uint8_t RELAY_PIN = D2;
```

The example rejects `digital_write` commands aimed at other pins. Start with an LED or relay input that is safe to test before connecting a mains load.

## 5. Flash

Recommended Arduino IDE settings for a typical NodeMCU:

- Board: **NodeMCU 1.0 (ESP-12E Module)**
- Upload speed: 115200 or a stable value supported by the board
- Serial Monitor: 115200 baud

The exact board/flash settings can vary by ESP8266 module.

## 6. Expected Serial Monitor

A successful startup should show:

```
Connecting Wi-Fi....
IP: ...
RSSI: ...
SYLVIA SDK 0.53.2 initialized
SYLVIA: telemetry sent
```

Heartbeat is sent approximately every 15 seconds and telemetry approximately every 30 seconds in the reference example.

## 7. Expected cloud validation

The Connectivity verifier should progress through:

```
Cloud        ✓
Device       ✓
Datastreams  ✓
Telemetry    ✓
Heartbeat    ✓
Command      ✓
```

The command check sends `identify` and waits for an acknowledged persistent command.

## 8. Hardware success condition

The v0.53.1 hardware gate is complete when:

```
NodeMCU online
   +
fresh heartbeat
   +
persisted telemetry
   +
dashboard command
   +
physical GPIO action
   +
persistent ACK
```

## Security

Never commit a real Wi-Fi password, device token, or private key/certificate material to GitHub.
