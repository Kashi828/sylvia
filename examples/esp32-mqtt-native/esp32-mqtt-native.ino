#include <SylviaMQTT.h>

#define SYLVIA_DEVICE_ID "your-device-id"
#define SYLVIA_DEVICE_TOKEN "your-device-token"
#define SYLVIA_MQTT_BROKER "192.168.1.10"

const char* ssid = "YourWiFi";
const char* password = "YourPassword";

SylviaMQTT Sylvia(SYLVIA_DEVICE_ID, SYLVIA_DEVICE_TOKEN, SYLVIA_MQTT_BROKER);

void handleCommand(const String& command, const String& rawPayload) {
  Serial.print("SYLVIA command: ");
  Serial.println(command);

  if (command == "relay_on") {
    // digitalWrite(RELAY_PIN, HIGH);
    Sylvia.publishState("relay", true);
  } else if (command == "relay_off") {
    // digitalWrite(RELAY_PIN, LOW);
    Sylvia.publishState("relay", false);
  }
}

void setup() {
  Serial.begin(115200);
  Sylvia.onCommand(handleCommand);

  if (!Sylvia.begin(ssid, password)) {
    Serial.println("SYLVIA MQTT connection failed");
  }
}

void loop() {
  Sylvia.loop();

  // Example telemetry/state:
  // Sylvia.publishState("temperature", 27.4);
  delay(10);
}
