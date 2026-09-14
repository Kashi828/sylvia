import crypto from "node:crypto";
import { findDevice, validBearer } from "./store";
import { getGroup } from "./device-groups";
import { publishDeviceCommand } from "./mqtt-transport";

export type DispatchResult = { deviceId: string; status: "queued" | "sent" | "failed" | "rejected"; transport?: "mqtt"; operationKey: string; error?: string };
export type DispatchOperation = { id: string; groupId: string; command: string; payload: Record<string, unknown>; createdAt: string; results: DispatchResult[] };
const operations = new Map<string, DispatchOperation>();

export async function dispatchBulkCommand(groupId: string, command: string, payload: Record<string, unknown>, token: string, idempotencyKey?: string) {
  const group = getGroup(groupId);
  if (!group) throw new Error("Group not found");
  const id = idempotencyKey || crypto.randomUUID();
  const existing = operations.get(id);
  if (existing) return existing;
  const operation: DispatchOperation = { id, groupId, command, payload, createdAt: new Date().toISOString(), results: [] };
  operations.set(id, operation);
  for (const deviceId of group.deviceIds) {
    const numericId = Number(deviceId);
    const result: DispatchResult = { deviceId: String(deviceId), status: "queued", operationKey: `${id}:${deviceId}` };
    if (!Number.isFinite(numericId) || !validBearer(token, numericId)) { result.status = "rejected"; result.error = "Unauthorized device token"; operation.results.push(result); continue; }
    if (!findDevice(numericId)) { result.status = "rejected"; result.error = "Device not found"; operation.results.push(result); continue; }
    try { await publishDeviceCommand(numericId, { command, payload, operationId: id, operationKey: result.operationKey }); result.status = "sent"; result.transport = "mqtt"; }
    catch (error) { result.status = "failed"; result.error = error instanceof Error ? error.message : "Dispatch failed"; }
    operation.results.push(result);
  }
  operations.set(id, operation);
  return operation;
}
export function getDispatchOperation(id: string) { return operations.get(id) ?? null; }
export function listDispatchOperations() { return [...operations.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
