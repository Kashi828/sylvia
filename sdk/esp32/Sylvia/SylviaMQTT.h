#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

class SylviaMQTT {
public:
  SylviaMQTT(const char* deviceId, const char* token, const char* broker);
  bool begin(const char* ssid, const char* password);
  bool reconnect();
  void loop();
  bool publishState(const char* key, const char* value);
  bool publishState(const char* key, float value);
  bool publishState(const char* key, int value);
  bool publishState(const char* key, bool value);
  void onCommand(void (*callback)(const String& command, const String& payload));

private:
  String _deviceId;
  String _token;
  String _broker;
  String _commandTopic;
  String _stateTopic;
  WiFiClient _wifi;
  PubSubClient _mqtt;
  void (*_callback)(const String&, const String&) = nullptr;
  void handleMessage(const char* topic, const byte* payload, unsigned int length);
  static SylviaMQTT* _instance;
  static void mqttCallback(char* topic, byte* payload, unsigned int length);
};
