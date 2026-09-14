/*
  SYLVIA v0.22 secure onboarding concept.

  The device receives a short-lived provisioningId + claimCode from the
  SYLVIA dashboard/setup flow, claims it once, stores the returned
  credential securely, then uses the normal SYLVIA device SDK.

  Do not hard-code an owner's API token in production firmware.
*/

#include <WiFi.h>
#include <HTTPClient.h>

const char* SYLVIA_SERVER = "https://your-sylvia-host";
const char* PROVISIONING_ID = "paste-short-lived-id";
const char* CLAIM_CODE = "paste-one-time-claim-code";

void setup() {
  Serial.begin(115200);

  // Connect Wi-Fi first, then POST:
  // /api/v1/devices/provision/claim
  //
  // Example JSON:
  // {"provisioningId":"...","claimCode":"..."}
  //
  // Parse the response and store `credential` in secure device storage.
}

void loop() {
  delay(1000);
}
