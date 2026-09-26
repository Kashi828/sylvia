#include "Sylvia.h"

Sylvia::Sylvia()
  : _handlerCount(0),
    _handshakeComplete(false),
    _handshakeRetryIntervalMs(10000),
    _lastHandshakeAt(0),
    _persistenceReady(false),
    _recoveryPollPending(false),
    _wifiSessionActive(false),
    _wifiSessionCount(0),
    _configured(false),
    _heartbeatIntervalMs(15000),
    _commandPollIntervalMs(2000),
    _ackRetryIntervalMs(2000),
    _httpTimeoutMs(10000),
    _lastHeartbeatAt(0),
    _lastPollAt(0),
    _lastAckRetryAt(0),
    _lastCommandOk(false),
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
  _lastHandshakeAt = 0;
  _handshakeComplete = false;
  _protocolVersion = "";
  _transport = "";
  _capabilities = "";
  loadPersistentState();
  return true;
}

void Sylvia::loadPersistentState() {
  _persistenceReady = false;
  _recoveryPollPending = false;

  EEPROM.begin(PERSISTENCE_SIZE);

  PersistentSnapshot snapshot{};
  EEPROM.get(0, snapshot);
  if (snapshot.magic != PERSISTENCE_MAGIC || snapshot.version != 1) {
    return;
  }

  char lastId[65];
  char lastMessage[129];
  char pendingId[65];
  char pendingMessage[129];

  memcpy(lastId, snapshot.lastCommandId, sizeof(lastId));
  lastId[sizeof(lastId) - 1] = '\0';
  memcpy(lastMessage, snapshot.lastCommandMessage, sizeof(lastMessage));
  lastMessage[sizeof(lastMessage) - 1] = '\0';
  memcpy(pendingId, snapshot.pendingAckId, sizeof(pendingId));
  pendingId[sizeof(pendingId) - 1] = '\0';
  memcpy(pendingMessage, snapshot.pendingAckMessage, sizeof(pendingMessage));
  pendingMessage[sizeof(pendingMessage) - 1] = '\0';

  _lastCommandId = lastId;
  _lastCommandOk = snapshot.lastCommandOk != 0;
  _lastCommandMessage = lastMessage;
  _pendingAckId = pendingId;
  _pendingAckOk = snapshot.pendingAckOk != 0;
  _pendingAckMessage = pendingMessage;
  _persistenceReady = true;
  _recoveryPollPending = _lastCommandId.length() > 0;
}

bool Sylvia::savePersistentState() {
  if (!_persistenceReady) return false;

  PersistentSnapshot snapshot{};
  snapshot.magic = PERSISTENCE_MAGIC;
  snapshot.version = 1;
  snapshot.lastCommandOk = _lastCommandOk ? 1 : 0;
  snapshot.pendingAckOk = _pendingAckOk ? 1 : 0;
  snprintf(snapshot.lastCommandId, sizeof(snapshot.lastCommandId), "%s", _lastCommandId.c_str());
  snprintf(snapshot.lastCommandMessage, sizeof(snapshot.lastCommandMessage), "%s", _lastCommandMessage.c_str());
  snprintf(snapshot.pendingAckId, sizeof(snapshot.pendingAckId), "%s", _pendingAckId.c_str());
  snprintf(snapshot.pendingAckMessage, sizeof(snapshot.pendingAckMessage), "%s", _pendingAckMessage.c_str());

  EEPROM.put(0, snapshot);
  return EEPROM.commit();
}

bool Sylvia::handshake() {
  if (!_configured) return false;

  StaticJsonDocument<1536> response;
  if (!getJson(endpoint(("/api/v1/devices/" + _deviceId + "/handshake").c_str()), response)) {
    _handshakeComplete = false;
    return false;
  }

  const String negotiatedProtocol = response["protocolVersion"] | "";
  const String negotiatedTransport = response["transport"] | "";
  if (!negotiatedProtocol.length() || negotiatedProtocol != protocolVersion()) {
    _handshakeComplete = false;
    _lastError = "Unsupported SYLVIA protocol";
    return false;
  }
  if (!negotiatedTransport.length()) {
    _handshakeComplete = false;
    _lastError = "SYLVIA transport missing";
    return false;
  }

  _protocolVersion = negotiatedProtocol;
  _transport = negotiatedTransport;
  _capabilities = "";

  JsonArrayConst capabilities = response["capabilities"].as<JsonArrayConst>();
  for (JsonVariantConst item : capabilities) {
    const char* capability = item.as<const char*>();
    if (!capability || !capability[0]) continue;
    if (_capabilities.length()) _capabilities += ",";
    _capabilities += capability;
  }

  _handshakeComplete = true;
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
  if (!_rootCA.length()) { _lastError = "Root CA not configured"; return false; }
  BearSSL::X509List trustAnchor(_rootCA.c_str());
  client->setTrustAnchors(&trustAnchor);
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
  if (!_rootCA.length()) { _lastError = "Root CA not configured"; return false; }
  BearSSL::X509List trustAnchor(_rootCA.c_str());
  client->setTrustAnchors(&trustAnchor);
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
  body["firmware"] = firmware ? firmware : "sylvia-arduino-0.53.8";

  if (!isnan(temperature)) body["temperature"] = temperature;
  if (!isnan(battery)) body["battery"] = battery;

  JsonObject state = body.createNestedObject("state");
  state["sdkVersion"] = sdkVersion();
  state["uptimeMs"] = millis();
  state["wifiRssi"] = WiFi.RSSI();
  if (_handshakeComplete) {
    state["protocolVersion"] = _protocolVersion;
    state["transport"] = _transport;
    state["capabilities"] = _capabilities;
  }
  state["commandPersistence"] = _persistenceReady;
  state["commandRecoveryPending"] = _recoveryPollPending;
  state["wifiSessionCount"] = _wifiSessionCount;
  if (_lastCommandId.length()) {
    state["lastCommandId"] = _lastCommandId;
    state["lastCommandOk"] = _lastCommandOk;
    state["lastCommandMessage"] = _lastCommandMessage;
  }
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

bool Sylvia::reportState(const char* key, int value) {
  if (!key) return false;
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
  const String previousPendingId = _pendingAckId;
  const bool previousPendingOk = _pendingAckOk;
  const String previousPendingMessage = _pendingAckMessage;

  if (!sent) {
    _pendingAckId = commandId;
    _pendingAckOk = ok;
    _pendingAckMessage = message;
  } else {
    _pendingAckId = "";
    _pendingAckMessage = "";
  }

  if (previousPendingId != _pendingAckId ||
      previousPendingOk != _pendingAckOk ||
      previousPendingMessage != _pendingAckMessage) {
    savePersistentState();
  }
  return sent;
}

void Sylvia::executeCommand(JsonObjectConst command) {
  const String id = command["id"] | "";
  const String name = command["command"] | "";

  if (!id.length() || !name.length()) return;

  if (_lastCommandId == id) {
    acknowledge(id, _lastCommandOk, _lastCommandMessage);
    return;
  }

  CommandHandler handler = findHandler(name);
  bool ok = false;
  String message;

  if (!handler) {
    message = "unsupported command";
  } else {
    JsonObjectConst payload = command["payload"].is<JsonObjectConst>()
      ? command["payload"].as<JsonObjectConst>()
      : JsonObjectConst();
    ok = handler(payload);
    message = ok ? "custom command executed" : "custom command failed";
  }

  _lastCommandId = id;
  _lastCommandOk = ok;
  _lastCommandMessage = message;
  _recoveryPollPending = false;
  savePersistentState();
  acknowledge(id, ok, message);
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
  String url = "/api/v1/devices/" + _deviceId + "/commands";
  if (_recoveryPollPending && _lastCommandId.length()) {
    url += "?recoveryCommandId=" + _lastCommandId;
  }
  if (!getJson(endpoint(url.c_str()), response)) return;

  _recoveryPollPending = false;
  savePersistentState();

  JsonArrayConst commands = response["commands"].as<JsonArrayConst>();
  for (JsonObjectConst command : commands) {
    executeCommand(command);
  }
}
void Sylvia::loop() {
  if (!_configured) return;

  const bool wifiConnected = WiFi.status() == WL_CONNECTED;
  if (!wifiConnected) {
    if (_wifiSessionActive) {
      _wifiSessionActive = false;
      _handshakeComplete = false;
      _recoveryPollPending = _lastCommandId.length() > 0;
      _lastHandshakeAt = 0;
      _lastHeartbeatAt = 0;
      _lastPollAt = 0;
      _lastAckRetryAt = 0;
    }
    return;
  }

  if (!_wifiSessionActive) {
    _wifiSessionActive = true;
    ++_wifiSessionCount;
    _handshakeComplete = false;
    _recoveryPollPending = _lastCommandId.length() > 0;
    _lastHandshakeAt = 0;
    _lastHeartbeatAt = 0;
    _lastPollAt = 0;
    _lastAckRetryAt = 0;
  }

  const unsigned long now = millis();

  if (!_handshakeComplete &&
      (_lastHandshakeAt == 0 || now - _lastHandshakeAt >= _handshakeRetryIntervalMs)) {
    _lastHandshakeAt = now;
    handshake();
  }

  retryPendingAck();

  if (_lastHeartbeatAt == 0 || now - _lastHeartbeatAt >= _heartbeatIntervalMs) {
    _lastHeartbeatAt = now;
    heartbeat();
  }

  if (_lastPollAt == 0 || now - _lastPollAt >= _commandPollIntervalMs) {
    _lastPollAt = now;
    pollCommands();
  }
}
