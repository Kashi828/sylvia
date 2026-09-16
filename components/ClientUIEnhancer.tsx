'use client';

import {useEffect, useRef, useState} from 'react';
import {Activity, CheckCircle2, Gauge, Radio, RefreshCw, Server, Settings2, Sparkles, Wifi} from 'lucide-react';

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

    const render = () => {
      const content = document.querySelector('.content');
      if (!content) return;

      const brandVersion = document.querySelector('.brand > div:last-child span');
      if (brandVersion) brandVersion.textContent = 'IOT PLATFORM · v0.51 BETA';

      const headerStatus = document.querySelector('.headerRight .status');
      if (headerStatus) {
        headerStatus.innerHTML = '<i></i> Cloud fabric online';
      }

      const overviewGrid = content.querySelector('.deviceGrid');
      const existing = document.getElementById(enhanceId);
      const isOverview = Boolean(overviewGrid);

      if (!isOverview) {
        existing?.remove();
        return;
      }

      if (existing) {
        const db = existing.querySelector('[data-health="db"]');
        const mqtt = existing.querySelector('[data-health="mqtt"]');
        const ready = existing.querySelector('[data-health="ready"]');
        if (db) db.textContent = health?.db ? 'Connected' : 'Checking…';
        if (mqtt) mqtt.textContent = health?.mqtt ? 'Connected' : 'Checking…';
        if (ready) ready.textContent = health?.ready ? 'Ready' : 'Warming up';
        return;
      }

      const devices = (() => { try { return JSON.parse(localStorage.getItem('sylvia.devices') || '[]'); } catch { return []; } })();
      const streams = (() => { try { return JSON.parse(localStorage.getItem('sylvia.streams') || '[]'); } catch { return []; } })();
      const rules = (() => { try { return JSON.parse(localStorage.getItem('sylvia.rules') || '[]'); } catch { return []; } })();
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
          <button class="secondary sylviaRefreshHealth" type="button"><span class="sylviaRefreshIcon"></span> Refresh status</button>
        </div>
        <div class="sylviaQuickGrid">
          <button class="sylviaQuickCard" data-nav="Devices" type="button"><span class="sylviaQuickIcon"><${'span'}>⌁</${'span'}></span><span><b>Devices</b><small>${deviceCount} registered · ${online} online</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Datastreams" type="button"><span class="sylviaQuickIcon"><${'span'}>◫</${'span'}></span><span><b>Datastreams</b><small>${streamCount} channels ready</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Dashboard" type="button"><span class="sylviaQuickIcon"><${'span'}>◌</${'span'}></span><span><b>Dashboard Studio</b><small>Build live widgets and controls</small></span><em>Open</em></button>
          <button class="sylviaQuickCard" data-nav="Alerts" type="button"><span class="sylviaQuickIcon"><${'span'}>!</${'span'}></span><span><b>Automation & alerts</b><small>${ruleCount} automation rules configured</small></span><em>Open</em></button>
        </div>
        <div class="sylviaFabricGrid">
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon"><${'span'}>DB</${'span'}></span><span class="sylviaFabricState" data-health="db">${health?.db ? 'Connected' : 'Checking…'}</span></div><b>Supabase Postgres</b><small>Project data, state and telemetry persistence</small></article>
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon"><${'span'}>MQ</${'span'}></span><span class="sylviaFabricState" data-health="mqtt">${health?.mqtt ? 'Connected' : 'Checking…'}</span></div><b>EMQX MQTT</b><small>Live device transport and command channel</small></article>
          <article class="sylviaFabricCard"><div class="sylviaFabricTop"><span class="sylviaFabricIcon"><${'span'}>API</${'span'}></span><span class="sylviaFabricState" data-health="ready">${health?.ready ? 'Ready' : 'Warming up'}</span></div><b>SYLVIA API</b><small>Cloud endpoints and realtime control surface</small></article>
        </div>
      `;

      const actions = panel.querySelector('.sylviaRefreshHealth') as HTMLButtonElement | null;
      actions?.addEventListener('click', () => { void loadHealth(); });
      panel.querySelectorAll('[data-nav]').forEach((node) => {
        node.addEventListener('click', () => navClick((node as HTMLElement).dataset.nav || 'Overview'));
      });
      overviewGrid.after(panel);
    };

    observerRef.current = new MutationObserver(render);
    observerRef.current.observe(document.body, {childList:true, subtree:true});
    loadHealth();
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
