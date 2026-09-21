#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

#if defined(ESP8266)
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#elif defined(ESP32)
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#else
#error "Sylvia SDK currently supports ESP8266 and ESP32 only."
#endif

class Sylvia {
public:
  using CommandHandler = void (*)(JsonObjectConst payload);

  Sylvia();

  bool begin(
    const char* deviceId,
    const char* deviceToken,
    const char* baseUrl,
    const char* rootCA = nullptr
  );

  void loop();

  bool heartbeat(
    const char* firmware = nullptr,
    double temperature = NAN,
    double battery = NAN
  );

  bool reportState(const char* key, const char* value);
  bool reportState(const char* key, double value);
  bool reportState(const char* key, bool value);


  bool onCommand(const char* command, CommandHandler handler);

  const String& deviceId() const { return _deviceId; }
  bool connected() const { return _configured && WiFi.status() == WL_CONNECTED; }

  void setHeartbeatInterval(uint32_t intervalMs);
  void setCommandPollInterval(uint32_t intervalMs);

private:
  struct Handler {
    String command;
    CommandHandler callback;
  };

  static constexpr uint8_t MAX_HANDLERS = 12;
  Handler _handlers[MAX_HANDLERS];
  uint8_t _handlerCount;

  String _deviceId;
  String _deviceToken;
  String _baseUrl;
  String _rootCA;
  String _lastCommandId;

  bool _configured;
  uint32_t _heartbeatIntervalMs;
  uint32_t _commandPollIntervalMs;
  unsigned long _lastHeartbeatAt;
  unsigned long _lastPollAt;

  StaticJsonDocument<768> _state;

  String endpoint(const char* path) const;
  bool postJson(const String& url, const String& payload, int* statusCode = nullptr);
  bool getJson(const String& url, JsonDocument& document, int* statusCode = nullptr);

  void pollCommands();
  void executeCommand(JsonObjectConst command);
  void acknowledge(const String& commandId, bool ok, const String& message);
  CommandHandler findHandler(const String& command);
};
