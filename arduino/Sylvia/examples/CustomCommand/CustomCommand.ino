#include <Sylvia.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

const char* SYLVIA_URL = "https://YOUR_SYLVIA_DOMAIN";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

static const char SYLVIA_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_ROOT_CA_HERE
-----END CERTIFICATE-----
)EOF";

Sylvia sylvia;

void setRelay(JsonObjectConst payload) {
  const int pin = payload["pin"] | D2;
  const int value = payload["value"] | 0;

  pinMode(pin, OUTPUT);
  digitalWrite(pin, value ? HIGH : LOW);

  sylvia.reportState("relayPin", pin);
  sylvia.reportState("relayOn", value != 0);
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");

  if (!sylvia.begin(DEVICE_ID, DEVICE_TOKEN, SYLVIA_URL, SYLVIA_ROOT_CA)) {
    Serial.println("SYLVIA initialization failed");
    return;
  }

  sylvia.onCommand("digital_write", setRelay);
  sylvia.reportState("sdk", "sylvia-arduino-0.1.0");
  sylvia.heartbeat("sylvia-arduino-0.1.0");
}

void loop() {
  sylvia.loop();
}
