#pragma once
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecureBearSSL.h>

class SylviaClient {
public:
  SylviaClient();
  bool begin(const char* deviceId, const char* deviceToken, const char* ssid, const char* password,
             const char* brokerHost, uint16_t brokerPort = 8883, const char* caPem = nullptr);
  void run();
  bool connected() const;
  bool virtualWrite(uint8_t channel, float value);
  bool virtualWrite(uint8_t channel, const String& value);
  bool virtualWrite(uint8_t channel, float value, const String& key);
  bool reportState(const String& key, const String& value);
  void onCommand(void (*handler)(const String& command, const String& payload));
private:
  BearSSL::WiFiClientSecure _tls;
  WiFiClient _plain;
  PubSubClient _mqtt;
  String _deviceId, _token;
  void (*_handler)(const String&, const String&) = nullptr;
  bool _secure = true;
  unsigned long _lastReconnect = 0;
  void mqttCallback(char* topic, byte* payload, unsigned int length);
  bool reconnect();
  String topic(const char* suffix) const;
};

extern SylviaClient Sylvia;
