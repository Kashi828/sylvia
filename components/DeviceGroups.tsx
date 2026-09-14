"use client";

import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
  description: string;
  deviceIds: string[];
};

export default function DeviceGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/groups", { cache: "no-store" });
    const data = await res.json();
    setGroups(data.groups ?? []);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setError("");
    const res = await fetch("/api/v1/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      setError("Unable to create group");
      return;
    }
    setName("");
    setDescription("");
    load();
  }

  return (
    <section className="deviceGroups">
      <div className="groupsHeader">
        <div>
          <div className="eyebrow">FLEET ORGANIZATION</div>
          <h1>Device Groups</h1>
          <p>Organize devices for easier fleet management.</p>
        </div>
      </div>

      <div className="groupCreate">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
        <button onClick={create}>Create group</button>
      </div>

      {error && <div className="fleetError">{error}</div>}

      <div className="groupGrid">
        {groups.length === 0 ? (
          <div className="groupEmpty">No groups yet. Create your first device group.</div>
        ) : groups.map(group => (
          <article className="groupCard" key={group.id}>
            <div className="groupIcon">G</div>
            <div>
              <h3>{group.name}</h3>
              <p>{group.description || "No description"}</p>
              <span>{group.deviceIds.length} devices</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
