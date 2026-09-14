import fs from "node:fs";
import process from "node:process";

const errors = [];
const warnings = [];
const env = process.env;
const required = ["DATABASE_URL", "SYLVIA_MQTT_BROKER", "SYLVIA_BRIDGE_TOKEN", "SYLVIA_PUBLIC_BASE_URL", "SYLVIA_DEVICE_TOKEN_SECRET"];
for (const key of required) if (!env[key]) errors.push(`Missing ${key}`);
if (env.SYLVIA_PUBLIC_BASE_URL && !/^https:\/\//i.test(env.SYLVIA_PUBLIC_BASE_URL)) errors.push("SYLVIA_PUBLIC_BASE_URL must use https://");
if (env.SYLVIA_MQTT_BROKER && !/^mqtts:\/\//i.test(env.SYLVIA_MQTT_BROKER)) warnings.push("MQTT broker is not mqtts://; use TLS for the hosted hardware beta.");
if (env.SYLVIA_MQTT_TLS === "true" && env.SYLVIA_MQTT_CA_FILE && !fs.existsSync(env.SYLVIA_MQTT_CA_FILE)) errors.push(`SYLVIA_MQTT_CA_FILE not found: ${env.SYLVIA_MQTT_CA_FILE}`);
if ((env.SYLVIA_DEVICE_TOKEN_SECRET || "").length < 32) errors.push("SYLVIA_DEVICE_TOKEN_SECRET should be at least 32 characters.");
if ((env.SYLVIA_BRIDGE_TOKEN || "").length < 32) errors.push("SYLVIA_BRIDGE_TOKEN should be at least 32 characters.");
console.log("SYLVIA v0.49 hosted beta preflight");
for (const w of warnings) console.log(`WARN: ${w}`);
if (errors.length) { for (const e of errors) console.error(`ERROR: ${e}`); process.exit(1); }
console.log("PASS: required hosted configuration is present.");
