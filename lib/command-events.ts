export type CommandEvent = {
  type: "device.command.updated";
  deviceId: string;
  commandId: string;
  status: "queued" | "sent" | "acked" | "failed";
  command: string;
  result: unknown;
  updatedAt: string;
};

type Listener = (event: CommandEvent) => void;
const listeners = new Set<Listener>();

export function subscribeCommand(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishCommand(event: CommandEvent) {
  for (const listener of listeners) {
    try { listener(event); } catch { /* isolate subscribers */ }
  }
}
