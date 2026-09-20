'use client';

import {useEffect, useRef, useState} from 'react';

const enhanceId = 'sylvia-overview-enhancements';
const launchId = 'sylvia-launch-screen';

function navClick(label: string) {
  const buttons = Array.from(document.querySelectorAll('.layout nav button')) as HTMLButtonElement[];
  const target = buttons.find((button) => button.textContent?.replace(/\s+/g, ' ').trim().includes(label));
  target?.click();
}

function showLaunchScreen() {
  if (window.location.pathname !== '/' || new URLSearchParams(window.location.search).has('console')) return;
  if (sessionStorage.getItem('sylvia.console.entered') === '1') return;
  if (document.getElementById(launchId)) return;

  const style = document.createElement('style');
  style.id = `${launchId}-style`;
  style.textContent = `
    #${launchId}{position:fixed;inset:0;z-index:9999;overflow:auto;background:#06070b;color:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #${launchId} *{box-sizing:border-box}
    .sl-nav{max-width:1180px;margin:auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between}.sl-brand{font-size:21px;font-weight:850;letter-spacing:.2em}.sl-brand span{font-size:10px;font-weight:500;letter-spacing:.1em;color:#778195;margin-left:10px}.sl-nav a,.sl-nav button,.sl-cta{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.045);color:#f6f7fb;border-radius:11px;padding:10px 15px;font:inherit;font-size:13px;font-weight:650;cursor:pointer;text-decoration:none}.sl-nav button{background:#f7f8fb;color:#08090d;border-color:#f7f8fb}
    .sl-hero{max-width:1180px;margin:auto;padding:110px 28px 90px;display:block}.sl-kicker{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#9ca6b9;font-size:11px}.sl-kicker i{width:7px;height:7px;border-radius:50%;background:#58e3aa;box-shadow:0 0 14px #58e3aa}.sl-hero h1{font-size:clamp(52px,7vw,88px);line-height:.94;letter-spacing:-.06em;margin:22px 0}.sl-hero h1 strong{font-weight:800}.sl-gradient{background:linear-gradient(105deg,#fff,#9ea9ff 55%,#7de8ff);-webkit-background-clip:text;background-clip:text;color:transparent}.sl-hero p{max-width:620px;color:#939caf;font-size:18px;line-height:1.65}.sl-actions{display:flex;gap:11px;margin-top:29px;flex-wrap:wrap}.sl-cta{padding:13px 18px}.sl-cta.primary{background:#fff;color:#07080b;border-color:#fff}.sl-meta{display:flex;gap:28px;margin-top:36px}.sl-meta b{display:block;font-size:14px}.sl-meta span{font-size:11px;color:#70798b}
    .sl-sections{max-width:1180px;margin:auto;padding:30px 28px 90px}.sl-title{max-width:650px;margin-bottom:28px}.sl-title h2{font-size:37px;letter-spacing:-.04em;margin:0 0 10px}.sl-title p{color:#858fa2;line-height:1.6}.sl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.sl-feature{padding:21px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:rgba(255,255,255,.025)}.sl-icon{font-size:17px;color:#aab6ff}.sl-feature b{display:block;margin:15px 0 7px;font-size:14px}.sl-feature span{font-size:12px;color:#7d8799;line-height:1.55}.sl-flow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:40px;padding:22px;border:1px solid rgba(255,255,255,.09);border-radius:17px;color:#8a94a7;font-size:12px}.sl-flow b{color:#f1f4fa}.sl-foot{text-align:center;color:#5f6879;font-size:11px;padding:24px 28px;border-top:1px solid rgba(255,255,255,.08)}
    @media(max-width:850px){.sl-hero{padding-top:55px}.sl-grid{grid-template-columns:1fr 1fr}.sl-hero h1{font-size:58px}.sl-flow{flex-wrap:wrap;justify-content:center}}
    @media(max-width:520px){.sl-grid{grid-template-columns:1fr}.sl-hero h1{font-size:50px}.sl-meta{gap:15px}.sl-nav{padding:18px}.sl-nav a{display:none}}
  `;
  document.head.appendChild(style);

  const page = document.createElement('div');
  page.id = launchId;
  page.innerHTML = `
    <nav class="sl-nav"><div class="sl-brand">SYLVIA <span>OPEN IoT PLATFORM</span></div><div style="display:flex;gap:8px;align-items:center"><a href="/developer">Developers</a><button type="button" data-enter>Open Console</button></div></nav>
    <section class="sl-hero">
      <div><span class="sl-kicker"><i></i> CLOUD-NATIVE IoT CONTROL</span><h1>Build.<br><span class="sl-gradient">Connect.</span><br>Automate.</h1><p>One control plane for devices, telemetry, dashboards, automation and hardware. Build IoT systems from one developer-first console.</p><div class="sl-actions"><button class="sl-cta primary" type="button" data-enter>Get Started</button></div><div class="sl-meta"><div><b>MQTT</b><span>Realtime transport</span></div><div><b>REST API</b><span>Developer access</span></div><div><b>ESP8266 / ESP32</b><span>Hardware ready</span></div></div></div>

    </section>
    <section class="sl-sections"><div class="sl-title"><h2>One console. One workspace.</h2><p>From the first virtual device to real hardware, SYLVIA brings the core control plane into one workspace.</p></div><div class="sl-grid"><article class="sl-feature"><div class="sl-icon">⌁</div><b>Device control</b><span>Provision, monitor and control connected devices from one console.</span></article><article class="sl-feature"><div class="sl-icon">◫</div><b>Live telemetry</b><span>Stream values into datastreams, analytics and realtime dashboards.</span></article><article class="sl-feature"><div class="sl-icon">◌</div><b>Dashboard Studio</b><span>Create focused visual controls for the systems you actually operate.</span></article><article class="sl-feature"><div class="sl-icon">⚡</div><b>Automation</b><span>Turn telemetry and device state into rules, events and actions.</span></article></div><div class="sl-flow"><span><b>Device</b> → MQTT/TLS</span><span><b>SYLVIA</b> → Telemetry</span><span><b>Dashboard</b> ↔ Commands</span><span><b>Optional ZYRA</b> → AI bridge</span></div></section>
    <footer class="sl-foot">SYLVIA · Open IoT platform · v0.51 Beta</footer>
  `;
  document.body.appendChild(page);
  page.querySelectorAll('[data-enter]').forEach((node) => node.addEventListener('click', () => {
    sessionStorage.setItem('sylvia.console.entered', '1');
    page.remove();
    style.remove();
  }));
}

export default function ClientUIEnhancer() {
  const observerRef = useRef<MutationObserver | null>(null);
  const [health, setHealth] = useState<{db:boolean;mqtt:boolean;ready:boolean} | null>(null);

  useEffect(() => {
    let active = true;
    showLaunchScreen();

    const loadHealth = async () => {
      try {
        const response = await fetch('/api/v1/health', {cache: 'no-store'});
        const data = await response.json();
        if (active) {
          setHealth({db: Boolean(data?.checks?.database?.connected),mqtt: Boolean(data?.checks?.mqtt?.connected),ready: Boolean(data?.ready)});
        }
      } catch { if (active) setHealth({db:false, mqtt:false, ready:false}); }
    };

    const setText = (root: Element | null, selector: string, value: string) => {
      const node = root?.querySelector(selector);
      if (node && node.textContent !== value) node.textContent = value;
    };

    const render = () => {
      const content = document.querySelector('.content');
      if (!content) return;
      const brandVersion = document.querySelector('.brand > div:last-child span');
      if (brandVersion && brandVersion.textContent !== 'IOT PLATFORM · v0.51 BETA') brandVersion.textContent = 'IOT PLATFORM · v0.51 BETA';
      const headerStatus = document.querySelector('.headerRight .status');
      if (headerStatus) {
        const textNode = Array.from(headerStatus.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
        if (textNode && textNode.textContent !== ' Cloud fabric online') textNode.textContent = ' Cloud fabric online';
      }
      const overviewGrid = content.querySelector('.deviceGrid');
      const existing = document.getElementById(enhanceId);
      if (!overviewGrid) { existing?.remove(); return; }
      if (existing) { setText(existing, '[data-health="db"]', health?.db ? 'Connected' : 'Checking…'); setText(existing, '[data-health="mqtt"]', health?.mqtt ? 'Connected' : 'Checking…'); setText(existing, '[data-health="ready"]', health?.ready ? 'Ready' : 'Warming up'); return; }
      const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
      const devices = read('sylvia.devices'); const streams = read('sylvia.streams'); const rules = read('sylvia.rules');
      const online = Array.isArray(devices) ? devices.filter((d: any) => d?.online).length : 0; const deviceCount = Array.isArray(devices) ? devices.length : 0; const streamCount = Array.isArray(streams) ? streams.length : 0; const ruleCount = Array.isArray(rules) ? rules.length : 0;
      const panel = document.createElement('section'); panel.id = enhanceId; panel.className = 'sylviaOverviewExtras';
      panel.innerHTML = `<div class="sylviaOverviewExtrasHead"><div><span class="eyebrow">SYLVIA WORKSPACE</span><h2>Operate from one control surface.</h2><p>Jump straight into the cloud resources you use most and see the live platform fabric at a glance.</p></div><button class="secondary sylviaRefreshHealth" type="button">↻ Refresh status</button></div><div class="sylviaQuickGrid"><button class="sylviaQuickCard" data-nav="Devices" type="button"><span class="sylviaQuickIcon">⌁</span><span><b>Devices</b><small>${deviceCount} registered · ${online} online</small></span><em>Open</em></button><button class="sylviaQuickCard" data-nav="Datastreams" type="button"><span class="sylviaQuickIcon">◫</span><span><b>Datastreams</b><small>${streamCount} channels ready</small></span><em>Open</em></button><button class="sylviaQuickCard" data-nav="Dashboard" type="button"><span class="sylviaQuickIcon">◌</span><span><b>Dashboard Studio</b><small>Build live widgets and controls</small></span><em>Open</em></button><button class="sylviaQuickCard" data-nav="Alerts" type="button"><span class="sylviaQuickIcon">!</span><span><b>Automation & alerts</b><small>${ruleCount} automation rules configured</small></span><em>Open</em></button></div><div class="sylviaFabricGrid"><article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">DB</span><span class="sylviaFabricState" data-health="db">${health?.db ? 'Connected' : 'Checking…'}</span></div><b>PostgreSQL</b><small>Project data, state and telemetry persistence</small></article><article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">MQ</span><span class="sylviaFabricState" data-health="mqtt">${health?.mqtt ? 'Connected' : 'Checking…'}</span></div><b>MQTT transport</b><small>Live device transport and command channel</small></article><article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">API</span><span class="sylviaFabricState" data-health="ready">${health?.ready ? 'Ready' : 'Warming up'}</span></div><b>SYLVIA API</b><small>Cloud endpoints and realtime control surface</small></article></div>`;
      panel.querySelector('.sylviaRefreshHealth')?.addEventListener('click', () => { void loadHealth(); }); panel.querySelectorAll('[data-nav]').forEach((node) => node.addEventListener('click', () => navClick((node as HTMLElement).dataset.nav || 'Overview'))); overviewGrid.after(panel);
    };
    observerRef.current = new MutationObserver(render); observerRef.current.observe(document.body, {childList:true, subtree:true}); void loadHealth(); render();
    return () => { active = false; observerRef.current?.disconnect(); observerRef.current = null; document.getElementById(enhanceId)?.remove(); };
  }, [health]);

  return null;
}
