#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

class SylviaESP32 {
public:
  bool begin(const char* deviceToken, const char* ssid, const char* password,
             const char* server = "http://192.168.1.100:3000");
  bool virtualWrite(uint8_t pin, const String& value);
  bool virtualWrite(uint8_t pin, int value);
  bool virtualWrite(uint8_t pin, long value);
  bool virtualWrite(uint8_t pin, float value);
  bool virtualWrite(uint8_t pin, bool value);
  String virtualRead(uint8_t pin);
  bool connect();
  void log(const String& message);
  bool command(const String& name);
  bool reportState(uint8_t streamId, const String& value);
  void onCommand(void (*handler)(const String& command, const String& payload));
  bool heartbeat();
  void run();
  bool connected() const { return WiFi.status() == WL_CONNECTED; }
private:
  String _token;
  String _server;
  unsigned long _lastHeartbeat = 0;
  bool postVirtual(uint8_t pin, const String& value);
  void pollCommands();
  void (*_commandHandler)(const String&, const String&) = nullptr;
};

extern SylviaESP32 Sylvia;
