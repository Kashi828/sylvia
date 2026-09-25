#include "Sylvia.h"

Sylvia::Sylvia()
  : _handlerCount(0),
    _configured(false),
    _heartbeatIntervalMs(15000),
    _commandPollIntervalMs(2000),
    _ackRetryIntervalMs(2000),
    _httpTimeoutMs(10000),
    _lastHeartbeatAt(0),
    _lastPollAt(0),
    _lastAckRetryAt(0),
    _lastHttpStatus(0),
    _pendingAckOk(false) {}

bool Sylvia::begin(
  const char* deviceId,
  const char* deviceToken,
  const char* baseUrl,
  const char* rootCA
) {
  _lastError = "";
  if (!deviceId || !deviceToken || !baseUrl || !deviceId[0] || !deviceToken[0] || !baseUrl[0]) {
    _lastError = "Device ID, token, and base URL are required";
    return false;
  }
  if (String(baseUrl).indexOf("https://") != 0) {
    _lastError = "SYLVIA requires an HTTPS base URL";
    return false;
  }
  if (!rootCA || !rootCA[0]) {
    _lastError = "Root CA is required for TLS validation";
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
  _lastHttpStatus = 0;
  _lastHeartbeatAt = 0;
  _lastPollAt = 0;
  _lastAckRetryAt = 0;
  return true;
}

void Sylvia::setHeartbeatInterval(uint32_t intervalMs) {
  _heartbeatIntervalMs = intervalMs < 5000 ? 5000 : intervalMs;
}

void Sylvia::setCommandPollInterval(uint32_t intervalMs) {
  _commandPollIntervalMs = intervalMs < 500 ? 500 : intervalMs;
}

void Sylvia::setHttpTimeout(uint32_t timeoutMs) {
  _httpTimeoutMs = timeoutMs < 1000 ? 1000 : timeoutMs;
}

String Sylvia::endpoint(const char* path) const {
  return _baseUrl + path;
}

bool Sylvia::postJson(const String& url, const String& payload, int* statusCode) {
  _lastHttpStatus = 0;
  _lastError = "";
  if (!_configured) { _lastError = "SDK not configured"; return false; }
  if (WiFi.status() != WL_CONNECTED) { _lastError = "Wi-Fi disconnected"; return false; }

#if defined(ESP8266)
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  if (_rootCA.length()) client->setCACert(_rootCA.c_str());
  else { _lastError = "Root CA not configured"; return false; }
#elif defined(ESP32)
  WiFiClientSecure client;
  if (_rootCA.length()) client.setCACert(_rootCA.c_str());
  else { _lastError = "Root CA not configured"; return false; }
#endif

  HTTPClient http;
#if defined(ESP8266)
  if (!http.begin(*client, url)) { _lastError = "HTTPS initialization failed"; return false; }
#else
  if (!http.begin(client, url)) { _lastError = "HTTPS initialization failed"; return false; }
#endif

  http.setTimeout(_httpTimeoutMs);
  http.addHeader("Authorization", String("Bearer ") + _deviceToken);
  http.addHeader("Content-Type", "application/json");

  const int code = http.POST(payload);
  if (statusCode) *statusCode = code;
  _lastHttpStatus = code;
  if (code < 0) _lastError = "HTTP transport error";
  else if (code < 200 || code >= 300) _lastError = String("HTTP status ") + code;
  http.end();

  return code >= 200 && code < 300;
}

bool Sylvia::getJson(const String& url, JsonDocument& document, int* statusCode) {
  _lastHttpStatus = 0;
  _lastError = "";
  if (!_configured) { _lastError = "SDK not configured"; return false; }
  if (WiFi.status() != WL_CONNECTED) { _lastError = "Wi-Fi disconnected"; return false; }

#if defined(ESP8266)
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  if (_rootCA.length()) client->setCACert(_rootCA.c_str());
  else { _lastError = "Root CA not configured"; return false; }
#elif defined(ESP32)
  WiFiClientSecure client;
  if (_rootCA.length()) client.setCACert(_rootCA.c_str());
  else { _lastError = "Root CA not configured"; return false; }
#endif

  HTTPClient http;
#if defined(ESP8266)
  if (!http.begin(*client, url)) { _lastError = "HTTPS initialization failed"; return false; }
#else
  if (!http.begin(client, url)) { _lastError = "HTTPS initialization failed"; return false; }
#endif

  http.setTimeout(_httpTimeoutMs);
  http.addHeader("Authorization", String("Bearer ") + _deviceToken);

  const int code = http.GET();
  if (statusCode) *statusCode = code;
  _lastHttpStatus = code;
  if (code != HTTP_CODE_OK) {
    _lastError = String("HTTP status ") + code;
    http.end();
    return false;
  }

  const DeserializationError error = deserializeJson(document, http.getStream());
  http.end();
  if (error) _lastError = "Invalid JSON response";

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
  body["datastreamId"] = streamId;
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
  body["datastreamId"] = streamId;
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
  body["firmware"] = firmware ? firmware : "sylvia-arduino-0.53.1";

  if (!isnan(temperature)) body["temperature"] = temperature;
  if (!isnan(battery)) body["battery"] = battery;

  JsonObject state = body.createNestedObject("state");
  state["sdkVersion"] = sdkVersion();
  state["uptimeMs"] = millis();
  state["wifiRssi"] = WiFi.RSSI();
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

bool Sylvia::acknowledge(const String& commandId, bool ok, const String& message) {
  StaticJsonDocument<384> body;
  body["commandId"] = commandId;

  JsonObject result = body.createNestedObject("result");
  result["ok"] = ok;
  result["message"] = message;

  String payload;
  serializeJson(body, payload);

  const bool sent = postJson(endpoint(("/api/v1/devices/" + _deviceId + "/commands").c_str()), payload);
  if (!sent) {
    _pendingAckId = commandId;
    _pendingAckOk = ok;
    _pendingAckMessage = message;
  } else {
    _pendingAckId = "";
    _pendingAckMessage = "";
  }
  return sent;
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

  const bool ok = handler(payload);
  acknowledge(id, ok, ok ? "custom command executed" : "custom command failed");
}

void Sylvia::retryPendingAck() {
  if (!_pendingAckId.length() || WiFi.status() != WL_CONNECTED) return;
  const unsigned long now = millis();
  if (_lastAckRetryAt != 0 && now - _lastAckRetryAt < _ackRetryIntervalMs) return;
  _lastAckRetryAt = now;
  if (acknowledge(_pendingAckId, _pendingAckOk, _pendingAckMessage)) {
    Serial.println("SYLVIA: pending command ACK delivered");
  }
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

  retryPendingAck();

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
