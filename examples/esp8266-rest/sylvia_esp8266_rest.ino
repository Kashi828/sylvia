#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SYLVIA_BASE_URL = "https://YOUR-SYLVIA-DOMAIN";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

// Replace this with the PEM CA certificate used by your SYLVIA HTTPS endpoint.
// Do not use setInsecure() for production hardware.
const char* SYLVIA_ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
REPLACE_WITH_YOUR_CA_CERTIFICATE
-----END CERTIFICATE-----
)EOF";

const uint8_t TELEMETRY_PIN = A0;
const uint8_t HEARTBEAT_INTERVAL_MS = 15000;
const uint8_t TELEMETRY_INTERVAL_MS = 5000;
const uint8_t COMMAND_POLL_INTERVAL_MS = 2000;

unsigned long lastHeartbeat = 0;
unsigned long lastTelemetry = 0;
unsigned long lastCommandPoll = 0;

WiFiClientSecure secureClient;

String apiUrl(const String& path) {
  return String(SYLVIA_BASE_URL) + path;
}

bool requestJson(
  const String& method,
  const String& path,
  const String& body,
  String& response,
  int& status
) {
  HTTPClient http;
  http.begin(secureClient, apiUrl(path));
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  status = method == "POST" ? http.POST(body) : http.GET();
  response = http.getString();
  http.end();
  return status >= 200 && status < 300;
}

void heartbeat() {
  StaticJsonDocument<192> doc;
  doc["firmware"] = "sylvia-esp8266-rest-0.1";
  doc["battery"] = 0;
  JsonObject metrics = doc.createNestedObject("metrics");
  metrics["analog"] = analogRead(TELEMETRY_PIN);

  String body;
  serializeJson(doc, body);

  String response;
  int status = 0;
  requestJson("POST", "/api/v1/devices/" + String(DEVICE_ID) + "/heartbeat", body, response, status);
}

void telemetry() {
  StaticJsonDocument<128> doc;
  doc["streamId"] = "analog";
  doc["key"] = "analog";
  doc["value"] = analogRead(TELEMETRY_PIN);
  doc["firmware"] = "sylvia-esp8266-rest-0.1";

  String body;
  serializeJson(doc, body);

  String response;
  int status = 0;
  requestJson("POST", "/api/v1/devices/" + String(DEVICE_ID) + "/telemetry", body, response, status);
}

void acknowledge(const String& commandId, const String& result) {
  StaticJsonDocument<192> doc;
  doc["commandId"] = commandId;
  JsonObject resultObject = doc.createNestedObject("result");
  resultObject["ok"] = true;
  resultObject["message"] = result;

  String body;
  serializeJson(doc, body);

  String response;
  int status = 0;
  requestJson("POST", "/api/v1/devices/" + String(DEVICE_ID) + "/commands", body, response, status);
}

void handleCommand(JsonObject command) {
  const String commandId = command["id"] | "";
  const String name = command["command"] | "";

  if (commandId.length() == 0) return;

  if (name == "digital_write") {
    JsonObject payload = command["payload"].as<JsonObject>();
    const int pin = payload["pin"] | -1;
    const int value = payload["value"] | -1;

    if (pin >= 0 && value >= 0) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, value ? HIGH : LOW);
      acknowledge(commandId, "digital_write applied");
      return;
    }
  }

  acknowledge(commandId, "unsupported command");
}

void pollCommands() {
  String response;
  int status = 0;

  if (!requestJson(
        "GET",
        "/api/v1/devices/" + String(DEVICE_ID) + "/commands?limit=5",
        "",
        response,
        status
      )) {
    return;
  }

  StaticJsonDocument<1536> doc;
  if (deserializeJson(doc, response)) return;

  JsonArray commands = doc["commands"].as<JsonArray>();
  for (JsonObject command : commands) {
    handleCommand(command);
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  connectWiFi();

  secureClient.setCACert(SYLVIA_ROOT_CA);

  heartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  const unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    heartbeat();
  }

  if (now - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    lastTelemetry = now;
    telemetry();
  }

  if (now - lastCommandPoll >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPoll = now;
    pollCommands();
  }

  delay(25);
}
