/**
 * Lightweight realtime event hub for the beta.
 * Dashboard clients can subscribe through the state SSE route.
 */

export type StateEvent = {
  type: "device.state.updated";
  deviceId: string;
  state: Record<string, string | number | boolean | null>;
  updatedAt: string;
};

type Listener = (event: StateEvent) => void;
const listeners = new Set<Listener>();

export function subscribeState(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishState(event: StateEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // One subscriber must never break the event hub.
    }
  }
}
