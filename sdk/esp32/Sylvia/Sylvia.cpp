#include "Sylvia.h"

SylviaESP32 Sylvia;

bool SylviaESP32::begin(const char* deviceToken, const char* ssid, const char* password, const char* server) {
  _token = deviceToken ? deviceToken : "";
  _server = server ? server : "";

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000UL) {
    delay(250);
  }

  return connected() && heartbeat();
}

bool SylviaESP32::postVirtual(uint8_t pin, const String& value) {
  if (!connected() || _token.isEmpty() || _server.isEmpty()) return false;

  HTTPClient http;
  http.begin(_server + "/api/v1/devices/virtual-write");
  http.addHeader("Authorization", "Bearer " + _token);
  http.addHeader("Content-Type", "application/json");

  String escaped = value;
  escaped.replace("\\", "\\\\");
  escaped.replace("\"", "\\\"");
  String body = String("{\"pin\":") + pin + ",\"value\":\"" + escaped + "\"}";
  const int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

bool SylviaESP32::virtualWrite(uint8_t pin, const String& value) { return postVirtual(pin, value); }
bool SylviaESP32::virtualWrite(uint8_t pin, int value) { return postVirtual(pin, String(value)); }
bool SylviaESP32::virtualWrite(uint8_t pin, long value) { return postVirtual(pin, String(value)); }
bool SylviaESP32::virtualWrite(uint8_t pin, float value) { return postVirtual(pin, String(value, 3)); }
bool SylviaESP32::virtualWrite(uint8_t pin, bool value) { return postVirtual(pin, value ? "true" : "false"); }

String SylviaESP32::virtualRead(uint8_t pin) {
  if (!connected() || _token.isEmpty() || _server.isEmpty()) return "";

  HTTPClient http;
  http.begin(_server + "/api/v1/devices/virtual-read?pin=" + String(pin));
  http.addHeader("Authorization", "Bearer " + _token);

  const int code = http.GET();
  const String body = code >= 200 && code < 300 ? http.getString() : "";
  http.end();

  return body;
}

bool SylviaESP32::heartbeat() {
  if (!connected() || _token.isEmpty() || _server.isEmpty()) return false;

  HTTPClient http;
  http.begin(_server + "/api/v1/devices/virtual-heartbeat");
  http.addHeader("Authorization", "Bearer " + _token);

  const int code = http.POST("{}", 2);
  http.end();

  return code >= 200 && code < 300;
}

void SylviaESP32::run() {
  if (millis() - _lastHeartbeat >= 30000UL) {
    _lastHeartbeat = millis();
    heartbeat();
  }
  pollCommands();
}

bool SylviaESP32::connect() {
  if (connected()) return true;
  WiFi.reconnect();
  unsigned long start = millis();
  while (!connected() && millis() - start < 10000UL) delay(250);
  return connected() && heartbeat();
}

void SylviaESP32::onCommand(void (*handler)(const String& command, const String& payload)) {
  _commandHandler = handler;
}

void SylviaESP32::pollCommands() {
  static unsigned long lastPoll = 0;
  if (millis() - lastPoll < 2000UL) return;
  lastPoll = millis();
  if (!connected() || _token.isEmpty() || _server.isEmpty() || !_commandHandler) return;
  HTTPClient http;
  http.begin(_server + "/api/v1/devices/commands/pending");
  http.addHeader("Authorization", "Bearer " + _token);
  const int code = http.GET();
  if (code >= 200 && code < 300) {
    String body=http.getString();
    int pos=0;
    while ((pos=body.indexOf("\"id\":\"",pos))>=0) {
      int idStart=pos+6; int idEnd=body.indexOf('"',idStart); if(idEnd<0)break;
      String commandId=body.substring(idStart,idEnd);
      int cmdPos=body.indexOf("\"command\":\"",idEnd); if(cmdPos<0)break;
      int cmdStart=cmdPos+11; int cmdEnd=body.indexOf('"',cmdStart); if(cmdEnd<0)break;
      String command=body.substring(cmdStart,cmdEnd);
      int payloadPos=body.indexOf("\"payload\":",cmdEnd); String payload="null";
      if(payloadPos>=0){int a=payloadPos+10;int b=body.indexOf('}',a);if(b<0)b=body.length();payload=body.substring(a,b);payload.trim();}
      _commandHandler(command,payload);
      HTTPClient ack; ack.begin(_server+"/api/v1/devices/commands/ack");
      ack.addHeader("Authorization","Bearer "+_token);ack.addHeader("Content-Type","application/json");
      String ackBody=String("{\"commandId\":\"")+commandId+"\",\"result\":{\"ok\":true}}";
      ack.POST(ackBody);ack.end(); pos=cmdEnd+1;
    }
  }
  http.end();
}
void SylviaESP32::log(const String& message) {
  Serial.println(String("[SYLVIA] ") + message);
}

bool SylviaESP32::command(const String& name) {
  if (!connected() || _token.isEmpty() || _server.isEmpty()) return false;
  HTTPClient http;
  http.begin(_server + "/api/v1/devices/command");
  http.addHeader("Authorization", "Bearer " + _token);
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"command\":\"") + name + "\"}";
  const int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}


static String sylviaJsonEscape(const String& value) {
  String out;
  for (size_t i = 0; i < value.length(); ++i) {
    char ch = value[i];
    if (ch == '"' || ch == '\\') out += '\\';
    out += ch;
  }
  return out;
}

bool Sylvia::reportState(const String& key, const String& value) {
  if (!_connected) return false;
  HTTPClient http;
  String url = _server + "/api/v1/devices/state";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + _token);
  String body = "{\"deviceId\":\"" + sylviaJsonEscape(_deviceId) +
                "\",\"values\":{\"" + sylviaJsonEscape(key) + "\":\"" +
                sylviaJsonEscape(value) + "\"}}";
  int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

bool Sylvia::reportState(const String& key, float value) {
  if (!_connected) return false;
  HTTPClient http;
  String url = _server + "/api/v1/devices/state";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + _token);
  String body = "{\"deviceId\":\"" + sylviaJsonEscape(_deviceId) +
                "\",\"values\":{\"" + sylviaJsonEscape(key) + "\":" +
                String(value, 4) + "}}";
  int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

bool Sylvia::reportState(const String& key, int value) {
  return reportState(key, String(value));
}

bool Sylvia::reportState(const String& key, bool value) {
  return reportState(key, value ? String("true") : String("false"));
}
