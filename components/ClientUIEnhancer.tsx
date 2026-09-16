'use client';

import {useEffect, useRef, useState} from 'react';

const enhanceId = 'sylvia-overview-enhancements';

function navClick(label: string) {
  const buttons = Array.from(document.querySelectorAll('.layout nav button')) as HTMLButtonElement[];
  const target = buttons.find((button) => button.textContent?.replace(/\s+/g, ' ').trim().includes(label));
  target?.click();
}

export default function ClientUIEnhancer() {
  const observerRef = useRef<MutationObserver | null>(null);
  const [health, setHealth] = useState<{db:boolean;mqtt:boolean;ready:boolean} | null>(null);

  useEffect(() => {
    let active = true;

    const loadHealth = async () => {
      try {
        const response = await fetch('/api/v1/health', {cache: 'no-store'});
        const data = await response.json();
        if (active) {
          setHealth({
            db: Boolean(data?.checks?.database?.connected),
            mqtt: Boolean(data?.checks?.mqtt?.connected),
            ready: Boolean(data?.ready),
          });
        }
      } catch {
        if (active) setHealth({db:false, mqtt:false, ready:false});
      }
    };

    const setText = (root: Element | null, selector: string, value: string) => {
      const node = root?.querySelector(selector);
      if (node && node.textContent !== value) node.textContent = value;
    };

    const render = () => {
      const content = document.querySelector('.content');
      if (!content) return;

      const brandVersion = document.querySelector('.brand > div:last-child span');
      if (brandVersion && brandVersion.textContent !== 'IOT PLATFORM · v0.51 BETA') {
        brandVersion.textContent = 'IOT PLATFORM · v0.51 BETA';
      }

      const headerStatus = document.querySelector('.headerRight .status');
      if (headerStatus) {
        const textNode = Array.from(headerStatus.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
        if (textNode && textNode.textContent !== ' Cloud fabric online') textNode.textContent = ' Cloud fabric online';
      }

      const overviewGrid = content.querySelector('.deviceGrid');
      const existing = document.getElementById(enhanceId);
      const isOverview = Boolean(overviewGrid);

      if (!isOverview) {
        existing?.remove();
        return;
      }

      if (existing) {
        setText(existing, '[data-health="db"]', health?.db ? 'Connected' : 'Checking…');
        setText(existing, '[data-health="mqtt"]', health?.mqtt ? 'Connected' : 'Checking…');
        setText(existing, '[data-health="ready"]', health?.ready ? 'Ready' : 'Warming up');
        return;
      }

      const read = (key: string) => {
        try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
      };
      const devices = read('sylvia.devices');
      const streams = read('sylvia.streams');
      const rules = read('sylvia.rules');
      const online = Array.isArray(devices) ? devices.filter((d: any) => d?.online).length : 0;
      const deviceCount = Array.isArray(devices) ? devices.length : 0;
      const streamCount = Array.isArray(streams) ? streams.length : 0;
      const ruleCount = Array.isArray(rules) ? rules.length : 0;

      const panel = document.createElement('section');
      panel.id = enhanceId;
      panel.className = 'sylviaOverviewExtras';
      panel.innerHTML = `
        <div class="sylviaOverviewExtrasHead">
          <div>
            <span class="eyebrow">SYLVIA WORKSPACE</span>
            <h2>Operate from one control surface.</h2>
            <p>Jump straight into the cloud resources you use most and see the live platform fabric at a glance.</p>
          </div>
          <button class="secondary sylviaRefreshHealth" type="button">↻ Refresh status</button>
        </div>
        <div class="sylviaQuickGrid">
          <button class="sylviaQuickCard" data-nav="Devices" type="button"><span class="sylviaQuickIcon">⌁</span><span><b>Devices</b><small>${deviceCount} registered · ${online} online</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Datastreams" type="button"><span class="sylviaQuickIcon">◫</span><span><b>Datastreams</b><small>${streamCount} channels ready</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Dashboard" type="button"><span class="sylviaQuickIcon">◌</span><span><b>Dashboard Studio</b><small>Build live widgets and controls</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Alerts" type="button"><span class="sylviaQuickIcon">!</span><span><b>Automation & alerts</b><small>${ruleCount} automation rules configured</small></span><em>Open</em></button>
        </div>
        <div class="sylviaFabricGrid">
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">DB</span><span class="sylviaFabricState" data-health="db">${health?.db ? 'Connected' : 'Checking…'}</span></div><b>Supabase Postgres</b><small>Project data, state and telemetry persistence</small></article>
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">MQ</span><span class="sylviaFabricState" data-health="mqtt">${health?.mqtt ? 'Connected' : 'Checking…'}</span></div><b>EMQX MQTT</b><small>Live device transport and command channel</small></article>
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon">API</span><span class="sylviaFabricState" data-health="ready">${health?.ready ? 'Ready' : 'Warming up'}</span></div><b>SYLVIA API</b><small>Cloud endpoints and realtime control surface</small></article>
        </div>
      `;

      panel.querySelector('.sylviaRefreshHealth')?.addEventListener('click', () => { void loadHealth(); });
      panel.querySelectorAll('[data-nav]').forEach((node) => {
        node.addEventListener('click', () => navClick((node as HTMLElement).dataset.nav || 'Overview'));
      });
      overviewGrid.after(panel);
    };

    observerRef.current = new MutationObserver(render);
    observerRef.current.observe(document.body, {childList:true, subtree:true});
    void loadHealth();
    render();

    return () => {
      active = false;
      observerRef.current?.disconnect();
      observerRef.current = null;
      document.getElementById(enhanceId)?.remove();
    };
  }, [health]);

  return null;
}
