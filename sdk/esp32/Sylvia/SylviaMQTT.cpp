#include "SylviaMQTT.h"

SylviaMQTT* SylviaMQTT::_instance = nullptr;

SylviaMQTT::SylviaMQTT(const char* deviceId, const char* token, const char* broker)
  : _deviceId(deviceId), _token(token), _broker(broker), _mqtt(_wifi) {
  _instance = this;
  _commandTopic = "sylvia/devices/" + _deviceId + "/command";
  _stateTopic = "sylvia/devices/" + _deviceId + "/state";
}

bool SylviaMQTT::begin(const char* ssid, const char* password) {
  WiFi.begin(ssid, password);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(250);
  }
  if (WiFi.status() != WL_CONNECTED) return false;

  _mqtt.setServer(_broker.c_str(), 1883);
  _mqtt.setCallback(SylviaMQTT::mqttCallback);
  return reconnect();
}

bool SylviaMQTT::reconnect() {
  if (_mqtt.connected()) return true;

  String clientId = "sylvia-" + _deviceId;
  bool ok = _mqtt.connect(clientId.c_str(), _deviceId.c_str(), _token.c_str());
  if (ok) {
    _mqtt.subscribe(_commandTopic.c_str(), 1);
  }
  return ok;
}

void SylviaMQTT::loop() {
  if (!_mqtt.connected()) reconnect();
  _mqtt.loop();
}

void SylviaMQTT::mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (_instance) _instance->handleMessage(topic, payload, length);
}

void SylviaMQTT::handleMessage(const char* topic, const byte* payload, unsigned int length) {
  if (_callback == nullptr || _commandTopic != topic) return;

  String body;
  for (unsigned int i = 0; i < length; ++i) body += static_cast<char>(payload[i]);

  // Expected message:
  // {"command":"relay","payload":{"value":true}}
  String command = body;
  int key = body.indexOf("\"command\"");
  if (key >= 0) {
    int colon = body.indexOf(':', key);
    int first = body.indexOf('"', colon + 1);
    int second = body.indexOf('"', first + 1);
    if (first >= 0 && second > first) {
      command = body.substring(first + 1, second);
    }
  }

  _callback(command, body);
}

void SylviaMQTT::onCommand(void (*callback)(const String&, const String&)) {
  _callback = callback;
}

bool SylviaMQTT::publishState(const char* key, const char* value) {
  if (!_mqtt.connected()) return false;
  String body = "{\"deviceId\":\"" + _deviceId +
                "\",\"values\":{\"" + key + "\":\"" + value + "\"}}";
  return _mqtt.publish(_stateTopic.c_str(), body.c_str(), true);
}

bool SylviaMQTT::publishState(const char* key, float value) {
  if (!_mqtt.connected()) return false;
  String body = "{\"deviceId\":\"" + _deviceId +
                "\",\"values\":{\"" + key + "\":" + String(value, 4) + "}}";
  return _mqtt.publish(_stateTopic.c_str(), body.c_str(), true);
}

bool SylviaMQTT::publishState(const char* key, int value) {
  return publishState(key, String(value).c_str());
}

bool SylviaMQTT::publishState(const char* key, bool value) {
  if (!_mqtt.connected()) return false;
  String body = "{\"deviceId\":\"" + _deviceId +
                "\",\"values\":{\"" + key + "\":" + (value ? "true" : "false") + "}}";
  return _mqtt.publish(_stateTopic.c_str(), body.c_str(), true);
}
