#include <Sylvia.h>
const char* WIFI_SSID="YOUR_WIFI";
const char* WIFI_PASSWORD="YOUR_PASSWORD";
const char* DEVICE_ID="YOUR_DEVICE_ID";
const char* DEVICE_TOKEN="YOUR_DEVICE_TOKEN";
const char* MQTT_BROKER="mqtt.example.com";
const uint16_t MQTT_PORT=8883;
static const char MQTT_CA[] PROGMEM="CERTIFICATE_PEM_HERE";
SylviaESP8266 Sylvia(DEVICE_ID,DEVICE_TOKEN,MQTT_BROKER,MQTT_PORT);
void handleCommand(const String& command,const String& payload){ if(command=="relay") Sylvia.reportState("relay",true); }
void setup(){Serial.begin(115200); Sylvia.onCommand(handleCommand); Sylvia.begin(WIFI_SSID,WIFI_PASSWORD,MQTT_CA);}
void loop(){ Sylvia.virtualWrite(0,analogRead(A0)); Sylvia.run(); delay(5000); }
