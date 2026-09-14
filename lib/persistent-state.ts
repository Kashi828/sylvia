/**
 * SYLVIA v0.18
 * Persistent device-state abstraction.
 *
 * Uses the existing server store by default so the beta remains runnable
 * without external infrastructure. The interface is intentionally isolated
 * so PostgreSQL/Redis can replace the backing implementation later.
 */

export type DeviceStateValue = string | number | boolean | null;

export type DeviceState = {
  deviceId: string;
  values: Record<string, DeviceStateValue>;
  updatedAt: string;
};

const stateStore = new Map<string, DeviceState>();

export function getDeviceState(deviceId: string): DeviceState {
  return (
    stateStore.get(deviceId) ?? {
      deviceId,
      values: {},
      updatedAt: new Date(0).toISOString(),
    }
  );
}

export function setDeviceState(
  deviceId: string,
  values: Record<string, DeviceStateValue>,
): DeviceState {
  const previous = getDeviceState(deviceId);
  const next: DeviceState = {
    deviceId,
    values: { ...previous.values, ...values },
    updatedAt: new Date().toISOString(),
  };
  stateStore.set(deviceId, next);
  return next;
}

export function clearDeviceState(deviceId: string) {
  stateStore.delete(deviceId);
}
