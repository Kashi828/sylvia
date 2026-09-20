import React from 'react';

const endpoints = [
  ['GET', '/api/v1/health', 'Platform health and runtime diagnostics'],
  ['GET', '/api/v1/devices', 'List registered devices'],
  ['POST', '/api/v1/devices/:id/heartbeat', 'Report device liveness'],
  ['POST', '/api/v1/datastreams/:id/value', 'Publish a datastream value'],
  ['GET', '/api/v1/fleet', 'Inspect fleet lifecycle state'],
];

const topics = [
  ['telemetry', 'sylvia/devices/{deviceId}/telemetry'],
  ['heartbeat', 'sylvia/devices/{deviceId}/heartbeat'],
  ['command', 'sylvia/devices/{deviceId}/command'],
  ['command-ack', 'sylvia/devices/{deviceId}/command-ack'],
];

export default function DeveloperCenter() {
  return (
    <main style={{minHeight:'100vh',background:'#06080c',color:'#f5f7fb',fontFamily:'system-ui,sans-serif'}}>
      <header style={{height:72,borderBottom:'1px solid #1b2430',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',background:'#090d13'}}>
        <div><b style={{letterSpacing:'.12em'}}>SYLVIA</b><span style={{display:'block',fontSize:10,color:'#728097',letterSpacing:'.12em'}}>DEVELOPER CENTER · v0.51 BETA</span></div>
        <a href="/" style={{color:'#aebbd0',textDecoration:'none',border:'1px solid #263244',borderRadius:10,padding:'9px 13px'}}>← Console</a>
      </header>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'42px 24px'}}>
        <span style={{fontSize:11,letterSpacing:'.12em',color:'#8298d9',fontWeight:700}}>DEVELOPER PLATFORM</span>
        <h1 style={{fontSize:42,lineHeight:1.05,letterSpacing:'-.04em',margin:'10px 0'}}>Build on SYLVIA.</h1>
        <p style={{color:'#8390a4',lineHeight:1.6,maxWidth:760}}>One developer surface for APIs, MQTT devices, firmware SDKs, webhooks and hardware testing.</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,margin:'28px 0'}}>
          {['REST API','MQTT','SDK','Sandbox'].map((x)=><div key={x} style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:15,padding:18}}><small style={{color:'#748197'}}>{x}</small><strong style={{display:'block',marginTop:10}}>Ready</strong></div>)}
        </div>

        <section style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:16,padding:22,marginTop:16}}>
          <h2>Integration flow</h2>
          <p style={{color:'#78879c'}}>The same contract connects firmware, scripts, gateways and cloud applications.</p>
          {['01 · Provision — Register a device and issue a device-scoped token.','02 · Connect — Connect ESP8266/ESP32 over MQTT/TLS or use REST.','03 · Telemetry — Publish datastream values and heartbeats.','04 · Automate — Dashboards, commands, alerts and webhooks consume the data.'].map(x=><div key={x} style={{padding:'14px 0',borderTop:'1px solid #18212d'}}>{x}</div>)}
        </section>

        <section style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:16,padding:22,marginTop:16}}>
          <h2>REST API</h2>
          <p style={{color:'#78879c'}}>HTTP endpoints for devices, gateways and external applications.</p>
          {endpoints.map(([method,path,desc])=><div key={path} style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:15,padding:'14px 0',borderTop:'1px solid #18212d'}}><b style={{color:'#79a0ff',fontSize:11}}>{method}</b><div><code>{path}</code><small style={{display:'block',color:'#748197',marginTop:4}}>{desc}</small></div></div>)}
        </section>

        <section style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:16,padding:22,marginTop:16}}>
          <h2>MQTT topic contract</h2>
          <p style={{color:'#78879c'}}>Hosted hardware uses MQTT/TLS for realtime communication.</p>
          {topics.map(([name,path])=><div key={name} style={{display:'grid',gridTemplateColumns:'110px 1fr',gap:15,padding:'14px 0',borderTop:'1px solid #18212d'}}><b>{name}</b><code>{path}</code></div>)}
        </section>

        <section style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:16,padding:22,marginTop:16}}>
          <h2>ESP8266 / NodeMCU SDK</h2>
          <p style={{color:'#78879c'}}>Native MQTT/TLS firmware support for the Hosted Hardware Beta path.</p>
          <pre style={{background:'#070b10',border:'1px solid #18212d',borderRadius:10,padding:16,overflow:'auto',color:'#b9c8dc'}}>{'#include <Sylvia.h>\n\nSylvia.begin("DEVICE_TOKEN", WIFI_SSID, WIFI_PASSWORD);\n\nvoid loop() {\n  Sylvia.run();\n  Sylvia.virtualWrite(0, temperature);\n  Sylvia.reportState("relay", true);\n}'}</pre>
        </section>

        <section style={{background:'#0b1017',border:'1px solid #1c2633',borderRadius:16,padding:22,marginTop:16}}>
          <h2>Developer workflow</h2>
          <p style={{color:'#78879c'}}>A hardware-free path for testing before physical deployment.</p>
          <ol style={{color:'#aebbd0',lineHeight:1.9}}>
            <li>Create a SYLVIA device and save its token.</li>
            <li>Choose REST or MQTT/TLS transport.</li>
            <li>Publish heartbeat and telemetry.</li>
            <li>Send cloud commands and verify acknowledgements.</li>
            <li>Move the same contract to real ESP8266/ESP32 hardware.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
