#include <WiFi.h>
#include <Sylvia.h>

#define SYLVIA_DEVICE_TOKEN "YOUR_DEVICE_TOKEN"
#define SYLVIA_SERVER "https://your-sylvia-host"

const char* ssid = "YourNetworkName";
const char* pass = "YourPassword";

void setup() {
  Serial.begin(115200);
  Sylvia.begin(SYLVIA_DEVICE_TOKEN, ssid, pass, SYLVIA_SERVER);
  Sylvia.log("Device connected to SYLVIA");
  Sylvia.onCommand(handleCommand);
}

void handleCommand(const String& command, const String& payload) {
  Serial.printf("[SYLVIA COMMAND] %s payload=%s\n", command.c_str(), payload.c_str());
  if (command == "identify") {
    // Add device-specific identification behavior here.
  }
}

void loop() {
  Sylvia.run();
  static unsigned long last = 0;
  if (millis() - last > 5000UL) {
    last = millis();
    Sylvia.virtualWrite(0, 25.4f);
    Sylvia.virtualWrite(1, true);
  }
}
