/* SYLVIA Arduino SDK — ESP8266 Cloud Test — v0.53.0-alpha.3 */
#include <ESP8266WiFi.h>
#include <Sylvia.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* SYLVIA_BASE_URL = "https://YOUR_SYLVIA_DOMAIN";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";
static const char SYLVIA_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_ROOT_CA_HERE
-----END CERTIFICATE-----
)EOF";
const char* TELEMETRY_STREAM_ID = "YOUR_DATASTREAM_ID";
const uint8_t RELAY_PIN = D2;
const uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
Sylvia sylvia;

void handleIdentify(JsonObjectConst payload) {
  (void)payload; Serial.println("SYLVIA: identify");
  digitalWrite(LED_BUILTIN, LOW); delay(250); digitalWrite(LED_BUILTIN, HIGH);
}
void handleSync(JsonObjectConst payload) {
  (void)payload; Serial.println("SYLVIA: sync");
  sylvia.reportState("relayOn", digitalRead(RELAY_PIN) == HIGH);
}
void handleDigitalWrite(JsonObjectConst payload) {
  const int pin = payload["pin"] | RELAY_PIN;
  const int value = payload["value"] | -1;
  if (pin < 0 || value < 0 || value > 1) { Serial.println("SYLVIA: invalid digital_write payload"); return; }
  pinMode(pin, OUTPUT); digitalWrite(pin, value ? HIGH : LOW);
  sylvia.reportState("relayPin", pin); sylvia.reportState("relayOn", value == 1);
  Serial.printf("SYLVIA: GPIO %d = %d\n", pin, value);
}

bool tlsConfigured() {
  return String(SYLVIA_ROOT_CA).indexOf("PASTE_ROOT_CA_HERE") < 0 &&
         String(SYLVIA_ROOT_CA).indexOf("-----BEGIN CERTIFICATE-----") >= 0 &&
         String(SYLVIA_ROOT_CA).indexOf("-----END CERTIFICATE-----") >= 0;
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting Wi-Fi");

  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("SYLVIA: Wi-Fi connection timeout");
    return false;
  }

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("RSSI: ");
  Serial.println(WiFi.RSSI());
  return true;
}

void setup() {
  Serial.begin(115200); pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, HIGH);
  pinMode(RELAY_PIN, OUTPUT); digitalWrite(RELAY_PIN, LOW);
  if (!connectWiFi()) return;
  if (!tlsConfigured()) { Serial.println("SYLVIA: replace PASTE_ROOT_CA_HERE with the production Root CA"); return; }
  if (!sylvia.begin(DEVICE_ID, DEVICE_TOKEN, SYLVIA_BASE_URL, SYLVIA_ROOT_CA)) { Serial.println("SYLVIA: begin() failed"); return; }
  sylvia.setHeartbeatInterval(15000); sylvia.setCommandPollInterval(2000);
  sylvia.setHttpTimeout(10000);
  sylvia.onCommand("identify", handleIdentify); sylvia.onCommand("sync", handleSync); sylvia.onCommand("digital_write", handleDigitalWrite);
  sylvia.reportState("relayPin", RELAY_PIN); sylvia.reportState("relayOn", false);
  Serial.print("SYLVIA SDK "); Serial.print(Sylvia::sdkVersion()); Serial.println(" initialized");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); return; }
  sylvia.loop();
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 30000 || lastTelemetry == 0) {
    lastTelemetry = millis();
    const double uptimeSeconds = millis() / 1000.0;
    Serial.println(sylvia.telemetry(TELEMETRY_STREAM_ID, uptimeSeconds) ? "SYLVIA: telemetry sent" : "SYLVIA: telemetry failed");
  }
}