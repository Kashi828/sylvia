#include "Sylvia.h"

Sylvia::Sylvia()
  : _handlerCount(0),
    _configured(false),
    _heartbeatIntervalMs(15000),
    _commandPollIntervalMs(2000),
    _lastHeartbeatAt(0),
    _lastPollAt(0) {}

bool Sylvia::begin(
  const char* deviceId,
  const char* deviceToken,
  const char* baseUrl,
  const char* rootCA
) {
  if (!deviceId || !deviceToken || !baseUrl || !deviceId[0] || !deviceToken[0] || !baseUrl[0]) {
    return false;
  }

  _deviceId = deviceId;
  _deviceToken = deviceToken;
  _baseUrl = baseUrl;
  _baseUrl.replace(" ", "");
  while (_baseUrl.endsWith("/")) {
    _baseUrl.remove(_baseUrl.length() - 1);
  }

  _rootCA = rootCA ? rootCA : "";

#if defined(ESP8266)
  WiFi.mode(WIFI_STA);
#elif defined(ESP32)
  WiFi.mode(WIFI_STA);
#endif

  _configured = true;
  _lastHeartbeatAt = 0;
  _lastPollAt = 0;
  return true;
}

void Sylvia::setHeartbeatInterval(uint32_t intervalMs) {
  _heartbeatIntervalMs = intervalMs < 5000 ? 5000 : intervalMs;
}

void Sylvia::setCommandPollInterval(uint32_t intervalMs) {
  _commandPollIntervalMs = intervalMs < 500 ? 500 : intervalMs;
}

String Sylvia::endpoint(const char* path) const {
  return _baseUrl + path;
}

bool Sylvia::postJson(const String& url, const String& payload, int* statusCode) {
  if (!_configured || WiFi.status() != WL_CONNECTED) return false;

#if defined(ESP8266)
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  if (_rootCA.length()) client->setCACert(_rootCA.c_str());
  else return false;
#elif defined(ESP32)
  WiFiClientSecure client;
  if (_rootCA.length()) client.setCACert(_rootCA.c_str());
  else return false;
#endif

  HTTPClient http;
#if defined(ESP8266)
  if (!http.begin(*client, url)) return false;
#else
  if (!http.begin(client, url)) return false;
#endif

  http.addHeader("Authorization", String("Bearer ") + _deviceToken);
  http.addHeader("Content-Type", "application/json");

  const int code = http.POST(payload);
  if (statusCode) *statusCode = code;
  http.end();

  return code >= 200 && code < 300;
}

bool Sylvia::getJson(const String& url, JsonDocument& document, int* statusCode) {
  if (!_configured || WiFi.status() != WL_CONNECTED) return false;

#if defined(ESP8266)
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  if (_rootCA.length()) client->setCACert(_rootCA.c_str());
  else return false;
#elif defined(ESP32)
  WiFiClientSecure client;
  if (_rootCA.length()) client.setCACert(_rootCA.c_str());
  else return false;
#endif

  HTTPClient http;
#if defined(ESP8266)
  if (!http.begin(*client, url)) return false;
#else
  if (!http.begin(client, url)) return false;
#endif

  http.addHeader("Authorization", String("Bearer ") + _deviceToken);

  const int code = http.GET();
  if (statusCode) *statusCode = code;

  if (code != HTTP_CODE_OK) {
    http.end();
    return false;
  }

  const DeserializationError error = deserializeJson(document, http.getStream());
  http.end();

  return !error;
}

bool Sylvia::telemetry(const char* streamId, double value) {
  if (!streamId || !streamId[0] || isnan(value)) return false;

  StaticJsonDocument<384> body;
  body["datastreamId"] = streamId;
  body["streamId"] = streamId;
  body["key"] = streamId;
  body["value"] = value;

  String payload;
  serializeJson(body, payload);
  return postJson(endpoint(("/api/v1/devices/" + _deviceId + "/telemetry").c_str()), payload);
}

bool Sylvia::telemetry(const char* streamId, const char* value) {
  if (!streamId || !streamId[0]) return false;

  StaticJsonDocument<512> body;
  body["streamId"] = streamId;
  body["key"] = streamId;
  body["value"] = value ? value : "";

  String payload;
  serializeJson(body, payload);
  return postJson(endpoint(("/api/v1/devices/" + _deviceId + "/telemetry").c_str()), payload);
}

bool Sylvia::telemetry(const char* streamId, bool value) {
  if (!streamId || !streamId[0]) return false;

  StaticJsonDocument<384> body;
  body["streamId"] = streamId;
  body["key"] = streamId;
  body["value"] = value;

  String payload;
  serializeJson(body, payload);
  return postJson(endpoint(("/api/v1/devices/" + _deviceId + "/telemetry").c_str()), payload);
}

bool Sylvia::heartbeat(const char* firmware, double temperature, double battery) {
  if (!_configured) return false;

  StaticJsonDocument<1024> body;
  body["firmware"] = firmware ? firmware : "sylvia-arduino-0.1.0";

  if (!isnan(temperature)) body["temperature"] = temperature;
  if (!isnan(battery)) body["battery"] = battery;

  JsonObject state = body.createNestedObject("state");
  for (JsonPair item : _state.as<JsonObject>()) {
    state[item.key()] = item.value();
  }

  String payload;
  serializeJson(body, payload);

  return postJson(endpoint(("/api/v1/devices/" + _deviceId + "/heartbeat").c_str()), payload);
}

bool Sylvia::reportState(const char* key, const char* value) {
  if (!key) return false;
  _state[key] = value ? value : "";
  return true;
}

bool Sylvia::reportState(const char* key, double value) {
  if (!key || isnan(value)) return false;
  _state[key] = value;
  return true;
}

bool Sylvia::reportState(const char* key, bool value) {
  if (!key) return false;
  _state[key] = value;
  return true;
}

bool Sylvia::onCommand(const char* command, CommandHandler handler) {
  if (!command || !command[0] || !handler) return false;

  for (uint8_t i = 0; i < _handlerCount; ++i) {
    if (_handlers[i].command == command) {
      _handlers[i].callback = handler;
      return true;
    }
  }

  if (_handlerCount >= MAX_HANDLERS) return false;

  _handlers[_handlerCount].command = command;
  _handlers[_handlerCount].callback = handler;
  ++_handlerCount;
  return true;
}

Sylvia::CommandHandler Sylvia::findHandler(const String& command) {
  for (uint8_t i = 0; i < _handlerCount; ++i) {
    if (_handlers[i].command == command) return _handlers[i].callback;
  }
  return nullptr;
}

void Sylvia::acknowledge(const String& commandId, bool ok, const String& message) {
  StaticJsonDocument<384> body;
  body["commandId"] = commandId;

  JsonObject result = body.createNestedObject("result");
  result["ok"] = ok;
  result["message"] = message;

  String payload;
  serializeJson(body, payload);

  postJson(endpoint(("/api/v1/devices/" + _deviceId + "/commands").c_str()), payload);
}

void Sylvia::executeCommand(JsonObjectConst command) {
  const String id = command["id"] | "";
  const String name = command["command"] | "";

  if (!id.length() || !name.length()) return;

  if (_lastCommandId == id) {
    acknowledge(id, true, "duplicate command ignored");
    return;
  }

  _lastCommandId = id;

  CommandHandler handler = findHandler(name);
  if (!handler) {
    acknowledge(id, false, "unsupported command");
    return;
  }

  JsonObjectConst payload = command["payload"].is<JsonObjectConst>()
    ? command["payload"].as<JsonObjectConst>()
    : JsonObjectConst();

  handler(payload);
  acknowledge(id, true, "custom command executed");
}

void Sylvia::pollCommands() {
  StaticJsonDocument<4096> response;
  if (!getJson(endpoint(("/api/v1/devices/" + _deviceId + "/commands").c_str()), response)) return;

  JsonArrayConst commands = response["commands"].as<JsonArrayConst>();
  for (JsonObjectConst command : commands) {
    executeCommand(command);
  }
}
void Sylvia::loop() {
  if (!_configured || WiFi.status() != WL_CONNECTED) return;

  const unsigned long now = millis();

  if (_lastHeartbeatAt == 0 || now - _lastHeartbeatAt >= _heartbeatIntervalMs) {
    _lastHeartbeatAt = now;
    heartbeat();
  }

  if (_lastPollAt == 0 || now - _lastPollAt >= _commandPollIntervalMs) {
    _lastPollAt = now;
    pollCommands();
  }
}
