#!/usr/bin/env node
/**
 * SYLVIA pre-hardware acceptance harness.
 *
 * Drives the full device protocol sequence in docs/PRODUCTION-ACCEPTANCE-v0.64.md
 * against a deployed instance, using only the public REST API — exactly the calls a
 * real ESP8266 makes. Everything except physical GPIO actuation is verifiable here, so
 * this run narrows the v1.0 gate down to "flash a board and confirm the pin moves".
 *
 *   node scripts/device-acceptance.mjs
 *   SYLVIA_BASE_URL=https://sylvia-orcin.vercel.app node scripts/device-acceptance.mjs
 *   node scripts/device-acceptance.mjs --keep        # leave the probe device behind
 *   node scripts/device-acceptance.mjs --json out.json
 *
 * Credentials come from SYLVIA_OWNER_EMAIL / SYLVIA_DEMO_PASSWORD (or the env file).
 * Exits non-zero if any gate fails, so it can gate CI or a release.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

// Load .env.production-secrets.local / .env.local without overriding real env.
for (const file of ['.env.production-secrets.local', '.env.local']) {
  try {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || m[1] in process.env) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* best effort */
  }
}

const BASE = (opt('base') || process.env.SYLVIA_BASE_URL || process.env.SYLVIA_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = opt('email') || process.env.SYLVIA_OWNER_EMAIL || 'owner@sylvia.local';
const PASSWORD = opt('password') || process.env.SYLVIA_DEMO_PASSWORD || '';
const KEEP = flag('keep');
const REPORT_PATH = opt('json', null);

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const DEVICE_NAME = `acceptance-esp8266-${stamp}`;
const STREAM_NAME = `acceptance_temp_${stamp}`;

const cookies = new Map();
const results = [];
const record = { base: BASE, startedAt: new Date().toISOString(), deviceName: DEVICE_NAME, gates: [], record: {}, cleanup: null };

function pass(section, name, detail) {
  results.push({ section, name, status: 'PASS', detail });
  process.stdout.write(`  PASS  ${name}${detail ? ` — ${detail}` : ''}\n`);
}
function fail(section, name, detail) {
  results.push({ section, name, status: 'FAIL', detail });
  process.stdout.write(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}\n`);
}
function skip(section, name, detail) {
  results.push({ section, name, status: 'SKIP', detail });
  process.stdout.write(`  SKIP  ${name}${detail ? ` — ${detail}` : ''}\n`);
}
function head(text) {
  process.stdout.write(`\n${text}\n${'-'.repeat(text.length)}\n`);
}

async function api(method, url, { body, token, expect, noCookies } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  // noCookies is used for negative isolation probes: a leaked session cookie would
  // authenticate the request and mask a missing authorization check.
  if (cookies.size && !noCookies) headers.cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });

  // Track the session cookie like a browser would.
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const raw of setCookie) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (expect && expect.includes(res.status)) return { status: res.status, json, ok: true };
  return { status: res.status, json, ok: res.ok, text };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  process.stdout.write(`SYLVIA acceptance harness → ${BASE}\n`);

  /* ---------- 1. Cloud prerequisites ---------- */
  head('1. Cloud prerequisites');
  const health = await api('GET', '/api/v1/health');
  if (health.status !== 200) {
    fail('prerequisites', 'health responds 200', `got ${health.status}`);
    return finish(1);
  }
  const h = health.json || {};
  record.record.deployment = h.deployment;
  record.record.platformVersion = h.version;
  pass('prerequisites', 'health responds 200', `${h.service} ${h.version} (${h.deployment})`);

  h.ready ? pass('prerequisites', 'ready:true') : fail('prerequisites', 'ready:true', JSON.stringify(h.checks || {}));
  h.restReady ? pass('prerequisites', 'restReady:true') : fail('prerequisites', 'restReady:true');
  h.checks?.database?.connected ? pass('prerequisites', 'database connected') : fail('prerequisites', 'database connected');
  h.checks?.runtimeSchema?.connected
    ? pass('prerequisites', 'schema complete')
    : fail('prerequisites', 'schema complete', `missing: ${(h.checks?.runtimeSchema?.missingTables || []).join(', ')}`);
  h.realtimeReady ? pass('prerequisites', 'realtimeReady (MQTT)') : skip('prerequisites', 'realtimeReady (MQTT)', 'MQTT optional for REST acceptance');
  record.record.sdkMinVersion = null;

  /* ---------- 2. Provision one device ---------- */
  head('2. Provision device + datastream');
  if (!PASSWORD) {
    fail('provision', 'owner credentials available', 'set SYLVIA_DEMO_PASSWORD');
    return finish(1);
  }
  const login = await api('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  if (login.status !== 200 || !login.json?.ok) {
    fail('provision', 'owner sign-in', `${login.status} ${login.json?.error || login.text?.slice(0, 80) || ''}`);
    return finish(1);
  }
  pass('provision', 'owner sign-in', login.json.user?.email || EMAIL);
  record.record.owner = login.json.user?.email || EMAIL;

  const projects = await api('GET', '/api/v1/projects');
  const projectId = projects.json?.projects?.[0]?.id;
  projectId ? pass('provision', 'workspace project resolved', projectId) : fail('provision', 'workspace project resolved');
  record.record.projectId = projectId || null;

  const reg = await api('POST', '/api/v1/devices', { body: { name: DEVICE_NAME, type: 'ESP8266 Device' } });
  if (reg.status !== 201 || !reg.json?.token) {
    fail('provision', 'device registered', `${reg.status} ${reg.json?.error || ''}`);
    return finish(1);
  }
  const deviceId = String(reg.json.device.id);
  const deviceToken = reg.json.token;
  pass('provision', 'device registered', `${deviceId} (${reg.json.persistent ? 'postgresql' : 'memory'})`);
  record.record.deviceId = deviceId;
  record.record.persistent = Boolean(reg.json.persistent);

  const stream = await api('POST', '/api/v1/datastreams', { body: { deviceId, name: STREAM_NAME, type: 'Number', unit: 'C' } });
  if (stream.status !== 201 || !stream.json?.datastream?.id) {
    fail('provision', 'datastream created', `${stream.status} ${stream.json?.error || ''}`);
    return finish(1);
  }
  const streamId = String(stream.json.datastream.id);
  pass('provision', 'datastream created', streamId);
  record.record.streamId = streamId;

  /* ---------- 3. Protocol handshake ---------- */
  head('3. Protocol handshake');
  const hs = await api('GET', `/api/v1/devices/${deviceId}/handshake`, { token: deviceToken });
  if (hs.status === 200 && hs.json?.ok) {
    pass('handshake', 'handshake authenticated', `protocol ${hs.json.protocolVersion}, sdk>=${hs.json.sdkMinVersion}`);
    (hs.json.capabilities || []).includes('command_ack')
      ? pass('handshake', 'advertises command_ack')
      : fail('handshake', 'advertises command_ack');
    record.record.protocolVersion = hs.json.protocolVersion;
    record.record.transport = hs.json.transport;
    record.record.sdkMinVersion = hs.json.sdkMinVersion;
  } else {
    fail('handshake', 'handshake authenticated', `${hs.status} ${hs.json?.error || ''}`);
  }

  const badToken = await api('GET', `/api/v1/devices/${deviceId}/handshake`, { token: 'not-a-real-token' });
  badToken.status === 401 ? pass('handshake', 'rejects a forged token') : fail('handshake', 'rejects a forged token', `got ${badToken.status}`);

  /* ---------- 4. Heartbeat ---------- */
  head('4. Heartbeat');
  const before = new Date().toISOString();
  const hb = await api('POST', `/api/v1/devices/${deviceId}/heartbeat`, {
    token: deviceToken,
    body: { firmware: '0.64.0-acceptance', temperature: 24.5, battery: 98 },
  });
  if (hb.status === 200 && hb.json?.online) {
    pass('heartbeat', 'device reports online', `lastSeen ${hb.json.lastSeen}`);
    record.record.firstHeartbeatAt = hb.json.lastSeen || before;
  } else {
    fail('heartbeat', 'device reports online', `${hb.status} ${hb.json?.error || ''}`);
  }

  const hbEvents = await api('GET', `/api/v1/events?deviceId=${deviceId}&kind=device.heartbeat&limit=5`);
  const hbSeen = (hbEvents.json?.events || []).length > 0;
  hbSeen ? pass('heartbeat', 'device.heartbeat event recorded') : fail('heartbeat', 'device.heartbeat event recorded');

  /* ---------- 5. Telemetry ---------- */
  head('5. Telemetry');
  const value = 31.5;
  const tel = await api('POST', `/api/v1/devices/${deviceId}/telemetry`, {
    token: deviceToken,
    body: { datastreamId: streamId, value, firmware: '0.64.0-acceptance' },
  });
  if (tel.status === 201 && tel.json?.ok) {
    pass('telemetry', 'authenticated ingestion', `value ${value} on ${streamId}`);
    record.record.firstTelemetryAt = new Date().toISOString();
  } else {
    fail('telemetry', 'authenticated ingestion', `${tel.status} ${tel.json?.error || ''}`);
  }

  const badType = await api('POST', `/api/v1/devices/${deviceId}/telemetry`, {
    token: deviceToken,
    body: { datastreamId: streamId, value: 'not-a-number' },
  });
  badType.status === 400 ? pass('telemetry', 'rejects type mismatch') : fail('telemetry', 'rejects type mismatch', `got ${badType.status}`);

  const badStream = await api('POST', `/api/v1/devices/${deviceId}/telemetry`, {
    token: deviceToken,
    body: { datastreamId: 'does-not-exist', value: 1 },
  });
  badStream.status === 404 ? pass('telemetry', 'rejects unregistered datastream') : fail('telemetry', 'rejects unregistered datastream', `got ${badStream.status}`);

  const readBack = await api('GET', `/api/v1/telemetry?deviceId=${deviceId}&streamId=${streamId}`);
  const persisted = (readBack.json?.samples || []).some((s) => Number(s.value) === value);
  persisted ? pass('telemetry', 'sample persisted and readable', readBack.json?.storage || '') : fail('telemetry', 'sample persisted and readable');
  record.record.telemetryStorage = readBack.json?.storage || null;

  const telEvents = await api('GET', `/api/v1/events?deviceId=${deviceId}&kind=telemetry.received&limit=5`);
  (telEvents.json?.events || []).length > 0
    ? pass('telemetry', 'telemetry.received event recorded')
    : fail('telemetry', 'telemetry.received event recorded');

  /* ---------- 6. Command and ACK ---------- */
  head('6. Command and ACK');
  const cmd = await api('POST', `/api/v1/devices/${deviceId}/command`, { body: { command: 'identify', payload: { pin: 2 } } });
  let commandId = cmd.json?.commandId || null;
  if (cmd.status === 200 && cmd.json?.ok && commandId) {
    pass('command', 'command created as persistent state', `${commandId} (${cmd.json.transport})`);
    record.record.commandId = commandId;
  } else {
    fail('command', 'command created as persistent state', `${cmd.status} ${cmd.json?.error || ''}`);
  }

  // The device claims the command, exactly like the firmware poll loop.
  const poll = await api('GET', `/api/v1/devices/${deviceId}/commands?limit=10`, { token: deviceToken });
  const claimed = (poll.json?.commands || []).some((c) => (c.id || c.commandId) === commandId);
  claimed ? pass('command', 'device claims the command') : fail('command', 'device claims the command', `count=${poll.json?.count ?? 0}`);

  const ack = await api('POST', '/api/v1/devices/commands/ack', {
    token: deviceToken,
    body: { commandId, result: { executed: true, pin: 2 } },
  });
  if (ack.status === 200 && ack.json?.ok) {
    pass('command', 'device posts ACK', ack.json.acknowledgedAt || '');
    record.record.commandAckedAt = ack.json.acknowledgedAt || new Date().toISOString();
  } else {
    fail('command', 'device posts ACK', `${ack.status} ${ack.json?.error || ''}`);
  }

  const history = await api('GET', `/api/v1/devices/${deviceId}/commands?history=true&limit=20`, { token: deviceToken });
  const acked = (history.json?.commands || []).find((c) => (c.id || c.commandId) === commandId);
  if (acked && (acked.status === 'acked' || acked.ackedAt)) {
    pass('command', 'cloud command reaches acked', acked.status || 'acked');
    record.record.commandStatus = acked.status || 'acked';
  } else {
    // A command stuck in queued/sent is explicitly NOT an acceptance pass.
    fail('command', 'cloud command reaches acked', `status=${acked?.status || 'missing'}`);
  }

  const ackEvents = await api('GET', `/api/v1/events?deviceId=${deviceId}&kind=device.command.ack&limit=5`);
  (ackEvents.json?.events || []).length > 0
    ? pass('command', 'device.command.ack event recorded')
    : fail('command', 'device.command.ack event recorded');

  /* ---------- 7. Automation and alerts ---------- */
  head('7. Automation and alerts');
  const automation = await api('POST', '/api/v1/automations', {
    body: {
      name: `acceptance-auto-${stamp}`,
      deviceId,
      streamId,
      operator: '>',
      threshold: 30,
      action: 'device_command',
      command: 'identify',
      payload: { pin: 2 },
      cooldownSeconds: 0,
    },
  });
  const automationId = automation.json?.automation?.id || null;
  automationId ? pass('automation', 'automation rule created', automationId) : fail('automation', 'automation rule created', `${automation.status} ${automation.json?.error || ''}`);

  const alert = await api('POST', '/api/v1/alerts/rules', {
    body: {
      name: `acceptance-alert-${stamp}`,
      deviceId,
      streamId,
      operator: '>',
      threshold: 30,
      severity: 'warning',
      cooldownSeconds: 0,
      action: 'none',
    },
  });
  const alertId = alert.json?.rule?.id || null;
  alertId ? pass('alerts', 'alert rule created', alertId) : fail('alerts', 'alert rule created', `${alert.status} ${alert.json?.error || ''}`);

  // Trigger both with real telemetry.
  await api('POST', `/api/v1/devices/${deviceId}/telemetry`, { token: deviceToken, body: { datastreamId: streamId, value: 42 } });

  const runs = await api('GET', '/api/v1/automation-runs?limit=50');
  // Rows come back in database shape (snake_case), not the camelCase the console uses.
  const run = (runs.json?.runs || []).find((r) => String(r.device_id) === deviceId && String(r.source_id) === automationId);
  if (run) {
    pass('automation', 'automation run persisted', `${run.id} (${run.status})`);
    record.record.automationRunId = run.id;
    record.record.automationRunStatus = run.status;
    record.record.automationCommandId = run.command_id || null;
  } else {
    fail('automation', 'automation run persisted', `no run for ${automationId}`);
  }

  const autoCmds = (await api('GET', `/api/v1/devices/${deviceId}/commands?history=true&limit=20`, { token: deviceToken })).json;
  const issued = run?.command_id
    ? (autoCmds?.commands || []).find((c) => c.id === run.command_id)
    : (autoCmds?.commands || []).find((c) => c.id !== commandId && c.command === 'identify');
  issued
    ? pass('automation', 'automation-issued command reaches the device', `${issued.id} (${issued.status})`)
    : fail('automation', 'automation-issued command reaches the device', 'no command issued by the rule');

  const alertEvents = await api('GET', '/api/v1/alerts/events?limit=50');
  const alertEvent = (alertEvents.json?.events || []).find((e) => String(e.deviceId) === deviceId);
  alertEvent ? pass('alerts', 'alert event recorded', alertEvent.id) : fail('alerts', 'alert event recorded');
  record.record.alertEventId = alertEvent?.id || null;

  /* ---------- 8. Recovery tests ---------- */
  head('8. Recovery');
  // Power-cycle: the same token must re-authenticate with no re-registration.
  const reHs = await api('GET', `/api/v1/devices/${deviceId}/handshake`, { token: deviceToken });
  reHs.status === 200 && reHs.json?.ok
    ? pass('recovery', 'power-cycle re-authenticates with the same token')
    : fail('recovery', 'power-cycle re-authenticates with the same token', `${reHs.status}`);

  const hb2 = await api('POST', `/api/v1/devices/${deviceId}/heartbeat`, { token: deviceToken, body: { temperature: 25 } });
  hb2.status === 200 && hb2.json?.online
    ? pass('recovery', 'heartbeat resumes after reconnect')
    : fail('recovery', 'heartbeat resumes after reconnect');

  const tel2 = await api('POST', `/api/v1/devices/${deviceId}/telemetry`, { token: deviceToken, body: { datastreamId: streamId, value: 26.25 } });
  tel2.status === 201 ? pass('recovery', 'telemetry resumes after reconnect') : fail('recovery', 'telemetry resumes after reconnect');

  const poll2 = await api('GET', `/api/v1/devices/commands/pending?deviceId=${deviceId}&limit=5`, { token: deviceToken });
  poll2.status === 200
    ? pass('recovery', 'REST fallback still delivers commands', `pending=${poll2.json?.commands?.length ?? 0}`)
    : fail('recovery', 'REST fallback still delivers commands', `${poll2.status}`);

  // A replayed ACK must not re-open or re-stamp an already-acked command.
  // The endpoint may answer 200 with the existing record (the UPDATE matched no row
  // and it falls back to a read), so the real test is that ackedAt is unchanged.
  const replay = await api('POST', '/api/v1/devices/commands/ack', { token: deviceToken, body: { commandId } });
  const replayedAt = replay.json?.acknowledgedAt || null;
  const originalAt = record.record.commandAckedAt || null;
  if (replayedAt && originalAt && replayedAt === originalAt && replay.json?.ok) {
    pass('recovery', 'replayed ACK does not re-stamp the command', 'ackedAt unchanged');
  } else if (replay.status === 404) {
    pass('recovery', 'replayed ACK is rejected', 'already acknowledged');
  } else {
    fail('recovery', 'replayed ACK is idempotent', `status ${replay.status}, ackedAt ${replayedAt} vs ${originalAt}`);
  }

  /* ---------- 9. Project isolation ---------- */
  head('9. Project isolation');
  const devicesInProject = await api('GET', '/api/v1/devices');
  const listed = (devicesInProject.json?.devices || []).some((d) => String(d.id) === deviceId);
  listed ? pass('isolation', 'project can list its own device') : fail('isolation', 'project can list its own device');

  // Negative probes carry no session cookie — otherwise the owner session would
  // authenticate the call and hide a missing authorization check.
  const foreignToken = 'sylvia_pk_deadbeefdeadbeefdeadbeefdeadbeef';
  const crossProject = await api('GET', `/api/v1/devices/${deviceId}/commands?history=true&limit=5`, { token: foreignToken, noCookies: true });
  crossProject.status === 401
    ? pass('isolation', 'foreign API key cannot read device commands')
    : fail('isolation', 'foreign API key cannot read device commands', `got ${crossProject.status}`);

  const crossTelemetry = await api('POST', `/api/v1/devices/${deviceId}/telemetry`, { token: foreignToken, noCookies: true, body: { datastreamId: streamId, value: 1 } });
  crossTelemetry.status === 401
    ? pass('isolation', 'foreign token cannot write telemetry')
    : fail('isolation', 'foreign token cannot write telemetry', `got ${crossTelemetry.status}`);

  const crossDatastream = await api('GET', `/api/v1/datastreams?deviceId=${deviceId}`, { noCookies: true });
  crossDatastream.status === 401
    ? pass('isolation', 'anonymous caller cannot list datastreams')
    : fail('isolation', 'anonymous caller cannot list datastreams', `got ${crossDatastream.status}`);

  /* ---------- Cleanup ---------- */
  if (KEEP) {
    record.cleanup = { kept: true, deviceId, note: 'probe device left registered (--keep)' };
    process.stdout.write(`\n  --keep: probe device ${deviceId} left in place.\n`);
  } else {
    head('Cleanup');
    const delStream = await api('DELETE', `/api/v1/datastreams?id=${streamId}`);
    delStream.json?.ok ? pass('cleanup', 'datastream removed') : skip('cleanup', 'datastream removed', `status ${delStream.status}`);
    const delDevice = await api('DELETE', `/api/v1/devices/${deviceId}`);
    delDevice.json?.ok || delDevice.status === 404 ? pass('cleanup', 'probe device removed') : skip('cleanup', 'probe device removed', `status ${delDevice.status}`);
    record.cleanup = { kept: false };
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  if (failed === 0) {
    process.stdout.write('\nAll software gates passed. The only remaining v1.0 item is physical ESP8266 actuation.\n');
  }
  return finish(failed === 0 ? 0 : 1);
}

function finish(code) {
  record.finishedAt = new Date().toISOString();
  record.gates = results;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  record.summary = { passed, failed, skipped, total: results.length };

  process.stdout.write(`\n${'='.repeat(52)}\n`);
  process.stdout.write(`RESULT  ${passed} passed · ${failed} failed · ${skipped} skipped\n`);
  if (failed) {
    process.stdout.write('\nFailed gates:\n');
    for (const r of results.filter((x) => x.status === 'FAIL')) process.stdout.write(`  - [${r.section}] ${r.name}: ${r.detail || ''}\n`);
  }
  process.stdout.write(`${'='.repeat(52)}\n`);

  if (REPORT_PATH) {
    fs.writeFileSync(path.resolve(process.cwd(), REPORT_PATH), JSON.stringify(record, null, 2));
    process.stdout.write(`Report written to ${REPORT_PATH}\n`);
  }
  process.exit(code);
}

main().catch((error) => {
  process.stderr.write(`\nHarness error: ${error?.stack || error}\n`);
  process.exit(2);
});