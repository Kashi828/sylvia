#define SYLVIA_TEMPLATE_ID "YOUR_TEMPLATE_ID"
#define SYLVIA_AUTH_TOKEN  "YOUR_DEVICE_TOKEN"
#define SYLVIA_SERVER      "http://YOUR_SYLVIA_HOST:3000"

#include <WiFi.h>
#include <Sylvia.h>

char ssid[] = "YourNetworkName";
char pass[] = "YourPassword";

void setup() {
  Serial.begin(115200);
  Sylvia.begin(SYLVIA_AUTH_TOKEN, ssid, pass, SYLVIA_SERVER);
}

void loop() {
  Sylvia.run();

  static unsigned long last = 0;
  if (millis() - last >= 5000UL) {
    last = millis();

    float temperature = 24.5f;
    Sylvia.virtualWrite(0, temperature); // V0
    Sylvia.virtualWrite(1, true);        // V1
  }
}
