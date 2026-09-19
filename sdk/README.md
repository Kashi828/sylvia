# SYLVIA Device SDK — v0.51.0-beta.3

SYLVIA now has a Blynk-style device programming model while remaining SYLVIA-native.

```text
BLYNK_TEMPLATE_ID                  -> SYLVIA_TEMPLATE_ID
BLYNK_AUTH_TOKEN                   -> SYLVIA_AUTH_TOKEN
Blynk.begin(token, ssid, pass)     -> Sylvia.begin(token, ssid, pass, server)
Blynk.virtualWrite(V0, value)     -> Sylvia.virtualWrite(0, value)
Blynk.run()                        -> Sylvia.run()
```

Virtual pins are presented by SYLVIA as `V0..V255`.

Example:

```cpp
#define SYLVIA_TEMPLATE_ID "YOUR_TEMPLATE_ID"
#define SYLVIA_AUTH_TOKEN  "YOUR_DEVICE_TOKEN"
#define SYLVIA_SERVER      "https://your-sylvia-host"

#include <WiFi.h>
#include <Sylvia.h>

char ssid[] = "YourNetworkName";
char pass[] = "YourPassword";

void setup() {
  Sylvia.begin(SYLVIA_AUTH_TOKEN, ssid, pass, SYLVIA_SERVER);
}

void loop() {
  Sylvia.run();
  Sylvia.virtualWrite(0, 25.4);
}
```

The current ESP8266/NodeMCU SDK uses MQTT/TLS for the hosted hardware path. Firmware identifies itself with a device ID and device token, validates the broker certificate, publishes telemetry and heartbeat messages, receives commands, and sends command acknowledgements. Keep the device token and broker CA private.
