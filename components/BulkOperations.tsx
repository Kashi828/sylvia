"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string; deviceIds: string[] };
type Operation = {
  id: string; groupId: string; command: string; createdAt: string;
  results: { deviceId: string; status: string; reason?: string }[];
};

export default function BulkOperations() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [groupId, setGroupId] = useState("");
  const [command, setCommand] = useState("");
  const [payload, setPayload] = useState("{}");
  const [message, setMessage] = useState("");

  async function load() {
    const [g, o] = await Promise.all([
      fetch("/api/v1/groups", { cache: "no-store" }),
      fetch("/api/v1/bulk-operations", { cache: "no-store" }),
    ]);
    setGroups((await g.json()).groups ?? []);
    setOperations((await o.json()).operations ?? []);
  }

  useEffect(() => { load(); }, []);

  async function execute() {
    setMessage("");
    if (!groupId || !command.trim()) return setMessage("Select a group and enter a command.");
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(payload); } catch { return setMessage("Payload must be valid JSON."); }

    const res = await fetch(`/api/v1/groups/${groupId}/bulk-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer demo" },
      body: JSON.stringify({ command, payload: parsed }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error ?? "Bulk operation failed.");
    setMessage(`Operation ${data.operation.id} created.`);
    load();
  }

  return (
    <section className="bulkPage">
      <div className="eyebrow">FLEET OPERATIONS</div>
      <h1>Bulk Operations</h1>
      <p className="bulkSubtitle">Send one command to a device group with per-device results.</p>

      <div className="bulkForm">
        <select value={groupId} onChange={e => setGroupId(e.target.value)}>
          <option value="">Select device group</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.deviceIds.length})</option>)}
        </select>
        <input value={command} onChange={e => setCommand(e.target.value)} placeholder="Command, e.g. relay_on" />
        <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={4} placeholder='{"value":true}' />
        <button onClick={execute}>Queue for group</button>
      </div>

      {message && <div className="fleetError">{message}</div>}

      <div className="bulkList">
        {operations.length === 0 ? <div className="groupEmpty">No bulk operations yet.</div> :
          operations.map(op => (
            <article className="bulkCard" key={op.id}>
              <div><strong>{op.command}</strong><span>{op.id}</span></div>
              <div>{op.results.filter(r => r.status === "queued").length} queued · {op.results.filter(r => r.status === "rejected").length} rejected</div>
              <small>{new Date(op.createdAt).toLocaleString()}</small>
            </article>
          ))}
      </div>
    </section>
  );
}
