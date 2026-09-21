#include <Sylvia.h>

Sylvia sylvia;

void setup() {
  Serial.begin(115200);
  WiFi.begin("YOUR_WIFI", "YOUR_PASSWORD");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  sylvia.begin(
    "YOUR_DEVICE_ID",
    "YOUR_DEVICE_TOKEN",
    "https://YOUR_SYLVIA_DOMAIN",
    SYLVIA_ROOT_CA
  );
}

void loop() {
  static unsigned long lastTelemetry = 0;

  sylvia.loop();

  if (millis() - lastTelemetry >= 10000) {
    lastTelemetry = millis();

    const double temperature = 25.0 + (millis() % 1000) / 100.0;
    sylvia.telemetry("temperature", temperature);
    sylvia.reportState("temperature", temperature);
  }
}
