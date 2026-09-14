 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FleetDevice = {
  deviceId: string;
  name: string;
  lifecycle: "provisioning" | "online" | "offline" | "disabled";
  lastSeen: string | null;
  firmware: string | null;
  transport: "rest" | "mqtt" | "unknown";
};

const labels = ["online", "offline", "provisioning", "disabled"] as const;

export default function FleetDashboard() {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [filter, setFilter] = useState<"all" | FleetDevice["lifecycle"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/v1/fleet", { cache: "no-store" });
      if (!res.ok) throw new Error("Fleet request failed");
      const data = await res.json();
      setDevices(data.devices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load fleet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    return labels.reduce(
      (acc, state) => {
        acc[state] = devices.filter((d) => d.lifecycle === state).length;
        return acc;
      },
      {} as Record<(typeof labels)[number], number>,
    );
  }, [devices]);

  const visible = filter === "all"
    ? devices
    : devices.filter((d) => d.lifecycle === filter);

  return (
    <section className="fleetDashboard">
      <div className="fleetHeader">
        <div>
          <div className="eyebrow">FLEET</div>
          <h1>Device Fleet</h1>
          <p>Live health, connectivity and lifecycle visibility.</p>
        </div>
        <button className="fleetRefresh" onClick={load}>Refresh</button>
      </div>

      <div className="fleetStats">
        <button className={filter === "all" ? "fleetStat active" : "fleetStat"} onClick={() => setFilter("all")}>
          <strong>{devices.length}</strong><span>Total devices</span>
        </button>
        <button className={filter === "online" ? "fleetStat active" : "fleetStat"} onClick={() => setFilter("online")}>
          <strong>{counts.online}</strong><span>Online</span>
        </button>
        <button className={filter === "offline" ? "fleetStat active" : "fleetStat"} onClick={() => setFilter("offline")}>
          <strong>{counts.offline}</strong><span>Offline</span>
        </button>
        <button className={filter === "provisioning" ? "fleetStat active" : "fleetStat"} onClick={() => setFilter("provisioning")}>
          <strong>{counts.provisioning}</strong><span>Provisioning</span>
        </button>
        <button className={filter === "disabled" ? "fleetStat active" : "fleetStat"} onClick={() => setFilter("disabled")}>
          <strong>{counts.disabled}</strong><span>Disabled</span>
        </button>
      </div>

      {error && <div className="fleetError">{error}</div>}

      <div className="fleetTableWrap">
        <table className="fleetTable">
          <thead>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Transport</th>
              <th>Firmware</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Loading fleet…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={5}>No devices match this filter.</td></tr>
            ) : visible.map((device) => (
              <tr key={device.deviceId}>
                <td>
                  <div className="fleetDeviceName">{device.name}</div>
                  <code>{device.deviceId}</code>
                </td>
                <td><span className={`fleetBadge ${device.lifecycle}`}>{device.lifecycle}</span></td>
                <td>{device.transport.toUpperCase()}</td>
                <td>{device.firmware || "—"}</td>
                <td>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
