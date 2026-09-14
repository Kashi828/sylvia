import { findDevice, validBearer } from "./store";

export type BulkOperationResult = { deviceId: string; status: "queued" | "rejected"; reason?: string };
export type BulkOperation = { id: string; groupId: string; command: string; payload: Record<string, unknown>; createdAt: string; results: BulkOperationResult[] };
const operations = new Map<string, BulkOperation>();
let sequence = 1;

export function createBulkOperation(groupId: string, deviceIds: string[], command: string, payload: Record<string, unknown>, token: string) {
  const results: BulkOperationResult[] = deviceIds.map((deviceId) => {
    const numericId = Number(deviceId);
    if (!Number.isFinite(numericId) || !validBearer(token, numericId)) return { deviceId: String(deviceId), status: "rejected", reason: "Unauthorized device token" };
    if (!findDevice(numericId)) return { deviceId: String(deviceId), status: "rejected", reason: "Device not found" };
    return { deviceId: String(deviceId), status: "queued" };
  });
  const operation: BulkOperation = { id: `bulk-${sequence++}`, groupId, command, payload, createdAt: new Date().toISOString(), results };
  operations.set(operation.id, operation);
  return operation;
}
export function getBulkOperation(id: string) { return operations.get(id) ?? null; }
export function listBulkOperations() { return [...operations.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
