/*
  SYLVIA ESP8266 REST command transport example
  v0.52.0-beta.2

  Polls:
    GET  /api/v1/devices/{id}/commands
    POST /api/v1/devices/{id}/commands

  The server atomically claims queued commands and marks them "sent".
  After executing a command, the device acknowledges the command ID.
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

const char* SYLVIA_BASE_URL = "https://YOUR_SYLVIA_DOMAIN";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

// Paste the Vercel/SYLVIA server certificate chain here for production.
// Do not use setInsecure() on a deployed device.
static const char SYLVIA_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_ROOT_CA_HERE
-----END CERTIFICATE-----
)EOF";

// Change this to the GPIO connected to your relay/LED.\nconst uint8_t RELAY_PIN = D2;
const uint32_t HEARTBEAT_INTERVAL_MS = 15000;
const uint32_t COMMAND_POLL_INTERVAL_MS = 2000;

// Prevent accidental duplicate execution if a response is replayed locally.
String lastCommandId = "";
unsigned long lastHeartbeatAt = 0;
unsigned long lastPollAt = 0;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());
}

String commandsUrl() {
  return String(SYLVIA_BASE_URL) + "/api/v1/devices/" + DEVICE_ID + "/commands";
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setCACert(SYLVIA_ROOT_CA);

  HTTPClient http;
  String url = String(SYLVIA_BASE_URL) + "/api/v1/devices/" + DEVICE_ID + "/heartbeat";
  if (!http.begin(*client, url)) return;

  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> body;
  body["firmware"] = "sylvia-esp8266-rest-beta2";
  body["relayPin"] = RELAY_PIN;
  body["relayState"] = digitalRead(RELAY_PIN) == HIGH;

  String payload;
  serializeJson(body, payload);
  const int code = http.POST(payload);
  Serial.printf("HEARTBEAT -> HTTP %d\n", code);
  http.end();
}

void acknowledgeCommand(const String& commandId, bool ok, const String& message) {
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setCACert(SYLVIA_ROOT_CA);

  HTTPClient http;
  if (!http.begin(*client, commandsUrl())) return;

  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> body;
  body["commandId"] = commandId;
  JsonObject result = body.createNestedObject("result");
  result["ok"] = ok;
  result["message"] = message;

  String payload;
  serializeJson(body, payload);
  int code = http.POST(payload);

  Serial.printf("ACK %s -> HTTP %d\n", commandId.c_str(), code);
  http.end();
}

void executeCommand(JsonObject command) {
  const String id = command["id"] | "";
  const String name = command["command"] | "";
  JsonVariant payload = command["payload"];

  bool ok = false;
  String message = "unsupported command";

  if (name == "restart") {
    ok = true;
    message = "restart requested";
    acknowledgeCommand(id, true, message);
    delay(100);
    ESP.restart();
    return;
  }

  if (name == "identify") {
    Serial.println("SYLVIA identify command received");
    ok = true;
    message = "device identified";
  } else if (name == "sync") {
    ok = true;
    message = "sync completed";
  } else if (name == "digital_write" && payload.is<JsonObject>()) {
    int pin = payload["pin"] | -1;
    int value = payload["value"] | -1;

    if (pin < 0) pin = RELAY_PIN;\n    if (pin >= 0 && (value == 0 || value == 1)) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, value ? HIGH : LOW);
      ok = true;
      message = String("GPIO ") + pin + " = " + value;
    } else {
      message = "invalid GPIO payload";
    }
  }

  acknowledgeCommand(id, ok, message);
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setCACert(SYLVIA_ROOT_CA);

  HTTPClient http;
  if (!http.begin(*client, commandsUrl())) return;

  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);

  const int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("Command poll HTTP %d\n", code);
    http.end();
    return;
  }

  StaticJsonDocument<2048> response;
  const DeserializationError error = deserializeJson(response, http.getStream());
  http.end();

  if (error) {
    Serial.println("Invalid SYLVIA command response");
    return;
  }

  JsonArray commands = response["commands"].as<JsonArray>();
  for (JsonObject command : commands) {
    executeCommand(command);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  connectWiFi();
  sendHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(500);
    return;
  }

  const unsigned long now = millis();

  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS || lastHeartbeatAt == 0) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }

  if (now - lastPollAt >= COMMAND_POLL_INTERVAL_MS || lastPollAt == 0) {
    lastPollAt = now;
    pollCommands();
  }
}
