export class SylviaClient {
  constructor(private baseUrl: string, private token: string) {}
  private async request(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    if (!res.ok) throw new Error(`SYLVIA ${res.status}`);
    return res.json();
  }
  manifest() { return this.request('/api/v1/integrations/zyra/manifest'); }
  devices() { return this.request('/api/v1/devices'); }
  emitTelemetry(payload: unknown) { return this.request('/api/v1/integrations/zyra/emit', { method: 'POST', body: JSON.stringify(payload) }); }
  command(deviceId: number, command: string, payload?: unknown) { return this.request('/api/v1/integrations/zyra/command', { method: 'POST', body: JSON.stringify({ deviceId, command, payload }) }); }
}
