export type DeviceGroup = {
  id: string;
  name: string;
  description: string;
  deviceIds: string[];
  createdAt: string;
  updatedAt: string;
};

const groups = new Map<string, DeviceGroup>();
let sequence = 1;

export function listGroups() {
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function createGroup(name: string, description = "") {
  const now = new Date().toISOString();
  const group: DeviceGroup = {
    id: `group-${sequence++}`,
    name: name.trim(),
    description: description.trim(),
    deviceIds: [],
    createdAt: now,
    updatedAt: now,
  };
  groups.set(group.id, group);
  return group;
}

export function getGroup(id: string) {
  return groups.get(id) ?? null;
}

export function updateGroupDevices(id: string, deviceIds: string[]) {
  const group = groups.get(id);
  if (!group) return null;
  group.deviceIds = [...new Set(deviceIds.filter(Boolean))];
  group.updatedAt = new Date().toISOString();
  groups.set(id, group);
  return group;
}

export function addDevicesToGroup(id: string, deviceIds: string[]) {
  const group = groups.get(id);
  if (!group) return null;
  group.deviceIds = [...new Set([...group.deviceIds, ...deviceIds.filter(Boolean)])];
  group.updatedAt = new Date().toISOString();
  groups.set(id, group);
  return group;
}
