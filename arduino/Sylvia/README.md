# SYLVIA Arduino SDK

Official SYLVIA cloud SDK for ESP8266 and ESP32.

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
- identify, sync, and custom command handlers
- GPIO command handling in the example
- Device state reporting
- ESP8266 and ESP32

## Security

Do not use setInsecure() on production devices. Keep device tokens secret and never commit real credentials.

## Hardware-alpha flow

Arduino → Wi-Fi → HTTPS/TLS → SYLVIA Cloud → heartbeat → telemetry → command → GPIO action → acknowledgement