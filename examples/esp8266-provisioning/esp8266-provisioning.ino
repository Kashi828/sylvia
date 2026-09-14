/* SYLVIA v0.44 secure device claim example.
   1) Create a provisioning claim in the hosted SYLVIA dashboard/API.
   2) Flash this example with the returned provisioningId + claimCode.
   3) POST the claim to /api/v1/devices/provision/claim from your provisioning tool.
   4) Store the returned credential securely on the NodeMCU.
*/
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* SYLVIA_API = "https://your-sylvia-host.example";
const char* PROVISIONING_ID = "YOUR_PROVISIONING_ID";
const char* CLAIM_CODE = "YOUR_ONE_TIME_CLAIM_CODE";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println("Wi-Fi connected. Submit the claim using your secure provisioning workflow.");
  // For production, validate the SYLVIA host CA and POST JSON:
  // {"provisioningId": PROVISIONING_ID, "claimCode": CLAIM_CODE}
  // Never print the returned device credential to logs.
}
void loop() { delay(1000); }
