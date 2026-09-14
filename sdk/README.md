# SYLVIA Device SDK — v0.16 Beta

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

The beta SDK uses HTTPS/REST and now supports bidirectional command delivery. Firmware can register `Sylvia.onCommand(...)`; `Sylvia.run()` polls pending commands every 2 seconds. Commands are queued server-side and removed when delivered. The application-level device API is intentionally transport-neutral so MQTT can be added underneath it later.
