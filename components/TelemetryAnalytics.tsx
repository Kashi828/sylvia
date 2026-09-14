"use client";

import { useEffect, useMemo, useState } from "react";

type Sample = {
  timestamp: string;
  value: number | string | boolean;
};

type Aggregate = {
  start: string;
  end: string;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
};

export default function TelemetryAnalytics() {
  const [deviceId, setDeviceId] = useState("demo-device");
  const [streamId, setStreamId] = useState("temperature");
  const [range, setRange] = useState("24h");
  const [bucket, setBucket] = useState("5m");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = useMemo(() => {
    const hours = range === "1h" ? 1 : range === "6h" ? 6 : range === "7d" ? 168 : 24;
    return new Date(Date.now() - hours * 3600000).toISOString();
  }, [range]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ deviceId, streamId, from, bucket });
      const res = await fetch(`/api/v1/telemetry/analytics?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analytics request failed");
      setSamples(data.samples || []);
      setAggregates(data.aggregates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [deviceId, streamId, range, bucket]);

  const values = samples.map(s => typeof s.value === "number" ? s.value : null).filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const chart = aggregates.slice(-60);
  const chartMin = chart.length ? Math.min(...chart.map(x => x.min ?? Infinity)) : 0;
  const chartMax = chart.length ? Math.max(...chart.map(x => x.max ?? -Infinity)) : 1;
  const span = chartMax - chartMin || 1;

  return (
    <section className="telemetryAnalytics">
      <div className="telemetryAnalyticsHeader">
        <div>
          <div className="eyebrow">TELEMETRY</div>
          <h1>Analytics</h1>
          <p>Explore device telemetry across time ranges and aggregation windows.</p>
        </div>
        <button className="telemetryRefresh" onClick={load}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <div className="telemetryControls">
        <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Device ID" />
        <input value={streamId} onChange={e => setStreamId(e.target.value)} placeholder="Stream ID" />
        <select value={range} onChange={e => setRange(e.target.value)}>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <select value={bucket} onChange={e => setBucket(e.target.value)}>
          <option value="1m">1 minute</option>
          <option value="5m">5 minutes</option>
          <option value="15m">15 minutes</option>
          <option value="1h">1 hour</option>
        </select>
      </div>

      {error && <div className="fleetError">{error}</div>}

      <div className="telemetryMetricGrid">
        <div><span>Samples</span><strong>{values.length}</strong></div>
        <div><span>Minimum</span><strong>{min === null ? "—" : min.toFixed(2)}</strong></div>
        <div><span>Average</span><strong>{avg === null ? "—" : avg.toFixed(2)}</strong></div>
        <div><span>Maximum</span><strong>{max === null ? "—" : max.toFixed(2)}</strong></div>
      </div>

      <div className="telemetryChartCard">
        <div className="telemetryCardTitle">Aggregated trend</div>
        {chart.length ? (
          <div className="telemetryBars" aria-label="Telemetry aggregated trend">
            {chart.map((item, i) => {
              const height = Math.max(6, (((item.average ?? chartMin) - chartMin) / span) * 100);
              return <div className="telemetryBarWrap" key={item.start + i} title={`${new Date(item.start).toLocaleString()}: ${item.average?.toFixed(2)}`}>
                <div className="telemetryBar" style={{ height: `${height}%` }} />
              </div>;
            })}
          </div>
        ) : <div className="telemetryEmpty">No numeric telemetry is available for this range.</div>}
      </div>

      <div className="telemetryTableWrap">
        <table className="fleetTable">
          <thead><tr><th>Bucket</th><th>Count</th><th>Min</th><th>Average</th><th>Max</th></tr></thead>
          <tbody>
            {aggregates.slice(-30).reverse().map(row => (
              <tr key={row.start}>
                <td>{new Date(row.start).toLocaleString()}</td>
                <td>{row.count}</td>
                <td>{row.min?.toFixed(2) ?? "—"}</td>
                <td>{row.average?.toFixed(2) ?? "—"}</td>
                <td>{row.max?.toFixed(2) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
