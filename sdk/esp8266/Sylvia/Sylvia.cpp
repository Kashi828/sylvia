#include "Sylvia.h"
#include <ArduinoJson.h>

SylviaClient Sylvia;

SylviaClient::SylviaClient() : _mqtt(_tls) {}

bool SylviaClient::begin(const char* deviceId, const char* deviceToken, const char* ssid, const char* password,
                         const char* brokerHost, uint16_t brokerPort, const char* caPem) {
  _deviceId = deviceId; _token = deviceToken;
  WiFi.mode(WIFI_STA); WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) delay(100);
  if (WiFi.status() != WL_CONNECTED) return false;
  // Hosted SYLVIA requires certificate validation. Do not silently fall back
  // to insecure TLS; provide the broker CA PEM when using MQTT/TLS.
  if (!caPem || !strlen(caPem)) return false;
  BearSSL::X509List* cert = new BearSSL::X509List(caPem);
  _tls.setTrustAnchors(cert);
  _mqtt.setServer(brokerHost, brokerPort);
  _mqtt.setCallback([this](char* t, byte* p, unsigned int l){ mqttCallback(t,p,l); });
  return reconnect();
}

String SylviaClient::topic(const char* suffix) const { return String("sylvia/devices/") + _deviceId + "/" + suffix; }

bool SylviaClient::reconnect() {
  if (_mqtt.connected()) return true;
  if (millis() - _lastReconnect < 2000) return false;
  _lastReconnect = millis();
  String clientId = String("sylvia-") + _deviceId;
  if (!_mqtt.connect(clientId.c_str(), _deviceId.c_str(), _token.c_str())) return false;
  _mqtt.subscribe(topic("command").c_str(), 1);
  StaticJsonDocument<192> heartbeat; heartbeat["online"] = true; heartbeat["token"] = _token; heartbeat["firmware"] = "esp8266-sdk-0.49";
  String hb; serializeJson(heartbeat, hb);
  _mqtt.publish(topic("heartbeat").c_str(), hb.c_str(), true);
  return true;
}

void SylviaClient::run() {
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();
  if (!_mqtt.connected()) reconnect();
  _mqtt.loop();
}

bool SylviaClient::connected() const { return WiFi.status() == WL_CONNECTED && _mqtt.connected(); }

bool SylviaClient::virtualWrite(uint8_t channel, float value) {
  if (!connected()) return false;
  StaticJsonDocument<192> doc; doc["channel"] = channel; doc["key"] = String("V") + channel; doc["value"] = value; doc["token"] = _token;
  String out; serializeJson(doc, out);
  return _mqtt.publish(topic("telemetry").c_str(), out.c_str(), false);
}

bool SylviaClient::virtualWrite(uint8_t channel, float value, const String& key) {
  if (!connected()) return false;
  StaticJsonDocument<224> doc; doc["channel"] = channel; doc["key"] = key; doc["value"] = value; doc["token"] = _token;
  String out; serializeJson(doc, out);
  return _mqtt.publish(topic("telemetry").c_str(), out.c_str(), false);
}

bool SylviaClient::virtualWrite(uint8_t channel, const String& value) {
  if (!connected()) return false;
  StaticJsonDocument<224> doc; doc["channel"] = channel; doc["key"] = String("V") + channel; doc["value"] = value; doc["token"] = _token;
  String out; serializeJson(doc, out);
  return _mqtt.publish(topic("telemetry").c_str(), out.c_str(), false);
}

bool SylviaClient::reportState(const String& key, const String& value) {
  if (!connected()) return false;
  StaticJsonDocument<256> doc; doc["key"] = key; doc["value"] = value; doc["token"] = _token;
  String out; serializeJson(doc, out);
  return _mqtt.publish(topic("state").c_str(), out.c_str(), true);
}

void SylviaClient::onCommand(void (*handler)(const String&, const String&)) { _handler = handler; }

void SylviaClient::mqttCallback(char* t, byte* payload, unsigned int length) {
  String body; body.reserve(length + 1);
  for (unsigned int i=0;i<length;i++) body += (char)payload[i];

  StaticJsonDocument<384> doc;
  DeserializationError error = deserializeJson(doc, body);
  if (error) return;

  String commandId = doc["commandId"] | "";
  String command = doc["command"] | "";
  String payloadJson;
  if (doc.containsKey("payload")) serializeJson(doc["payload"], payloadJson);

  if (_handler && command.length()) {
    _handler(command, payloadJson);
  }

  if (commandId.length()) {
    StaticJsonDocument<256> ack;
    ack["commandId"] = commandId;
    ack["token"] = _token;
    ack["result"]["handled"] = (_handler != nullptr);
    String out;
    serializeJson(ack, out);
    _mqtt.publish(topic("command-ack").c_str(), out.c_str(), false);
  }
}
