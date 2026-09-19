import { databaseConfigured, query } from "@/lib/db";

export type DeviceLifecycle = "provisioning" | "online" | "offline" | "disabled";
export type DeviceTransport = "rest" | "mqtt" | "unknown";

export type FleetDevice = {
  deviceId: string;
  name: string;
  lifecycle: DeviceLifecycle;
  lastSeen: string | null;
  firmware: string | null;
  transport: DeviceTransport;
  temperature: number;
  battery: number;
  createdAt: string;
  updatedAt?: string;
};

const registry = new Map<string, FleetDevice>();

function normalize(row: any): FleetDevice {
  return {
    deviceId: String(row.device_id),
    name: String(row.name),
    lifecycle: row.lifecycle as DeviceLifecycle,
    lastSeen: row.last_seen ? new Date(row.last_seen).toISOString() : null,
    firmware: row.firmware ?? null,
    transport: (row.transport ?? "unknown") as DeviceTransport,
    temperature: Number(row.temperature ?? 0),
    battery: Number(row.battery ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

async function persist(device: FleetDevice) {
  if (!databaseConfigured()) return;
  try {
    await query(
      `INSERT INTO device_registry
        (device_id, name, lifecycle, last_seen, firmware, transport, online, temperature, battery, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (device_id) DO UPDATE SET
         name=EXCLUDED.name,
         lifecycle=EXCLUDED.lifecycle,
         last_seen=EXCLUDED.last_seen,
         firmware=EXCLUDED.firmware,
         transport=EXCLUDED.transport,
         online=EXCLUDED.online,
         temperature=EXCLUDED.temperature,
         battery=EXCLUDED.battery,
         updated_at=EXCLUDED.updated_at`,
      [device.deviceId, device.name, device.lifecycle, device.lastSeen, device.firmware,
       device.transport, device.lifecycle === "online", device.temperature, device.battery,
       device.createdAt, device.updatedAt ?? new Date().toISOString()],
    );
  } catch {
    // Keep the beta usable when the database is unavailable; memory remains authoritative for the session.
  }
}

export async function hydrateFleetRegistry() {
  if (!databaseConfigured()) return listFleetDevices();
  try {
    const result = await query(`SELECT device_id,name,lifecycle,last_seen,firmware,transport,temperature,battery,created_at,updated_at FROM device_registry ORDER BY name ASC`);
    for (const row of result.rows) {
      const device = normalize(row);
      registry.set(device.deviceId, device);
    }
  } catch {
    // Migration may not have been applied yet; fall back to the in-memory registry.
  }
  return listFleetDevices();
}

export async function registerFleetDevice(
  deviceId: string,
  name = deviceId,
  transport: DeviceTransport = "unknown",
) {
  const existing = registry.get(deviceId);
  const now = new Date().toISOString();
  const device: FleetDevice = existing ?? {
    deviceId,
    name,
    lifecycle: "provisioning",
    lastSeen: null,
    firmware: null,
    transport,
    createdAt: now,
    updatedAt: now,
  };
  device.name = name || device.name;
  if (transport !== "unknown") device.transport = transport;
  device.updatedAt = now;
  registry.set(deviceId, device);
  await persist(device);
  return device;
}

export function getFleetDevice(deviceId: string) {
  return registry.get(deviceId) ?? null;
}

export function listFleetDevices() {
  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function setLifecycle(deviceId: string, lifecycle: DeviceLifecycle) {
  const device = await registerFleetDevice(deviceId);
  device.lifecycle = lifecycle;
  device.updatedAt = new Date().toISOString();
  registry.set(deviceId, device);
  await persist(device);
  return device;
}

export async function markDeviceSeen(
  deviceId: string,
  metadata?: { firmware?: string; transport?: DeviceTransport },
) {
  const device = await registerFleetDevice(deviceId);
  device.lastSeen = new Date().toISOString();
  device.lifecycle = device.lifecycle === "disabled" ? "disabled" : "online";
  if (metadata?.firmware) device.firmware = metadata.firmware;
  if (metadata?.transport) device.transport = metadata.transport;
  device.updatedAt = new Date().toISOString();
  registry.set(deviceId, device);
  await persist(device);
  return device;
}

export async function markStaleDevices(maxAgeMs = 90_000) {
  await hydrateFleetRegistry();
  const cutoff = Date.now() - maxAgeMs;
  const changed: FleetDevice[] = [];
  for (const device of registry.values()) {
    if (device.lifecycle === "online" && device.lastSeen && Date.parse(device.lastSeen) < cutoff) {
      device.lifecycle = "offline";
      device.updatedAt = new Date().toISOString();
      changed.push(device);
    }
  }
  for (const device of changed) await persist(device);
  return listFleetDevices();
}
