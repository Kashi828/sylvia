'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Cloud, Cpu, Database, Gauge, LockKeyhole, Radio, RefreshCw, Send, ShieldCheck, Wifi } from 'lucide-react';

type Check={id:string;label:string;detail:string;ok:boolean|null};

export default function BetaHardwarePage(){
 const [checks,setChecks]=useState<Check[]>([
  {id:'web',label:'SYLVIA web application',detail:'Hosted application responds to health checks.',ok:null},
  {id:'db',label:'PostgreSQL',detail:'Persistent device and telemetry storage is available.',ok:null},
  {id:'mqtt',label:'MQTT/TLS broker',detail:'Secure MQTT transport is configured.',ok:null},
  {id:'auth',label:'Device authentication',detail:'Device tokens are protected and scoped.',ok:null},
 ]);
 const [loading,setLoading]=useState(false); const [result,setResult]=useState('');
 const run=async()=>{setLoading(true);setResult('');try{const r=await fetch('/api/v1/health',{cache:'no-store'});const d=await r.json();const database=d.checks?.database;const mqtt=d.checks?.mqtt;setChecks(c=>c.map(x=>x.id==='web'?{...x,ok:r.ok}:{...x,ok:x.id==='db'?Boolean(database?.configured&&database?.connected):x.id==='mqtt'?Boolean(mqtt?.configured):x.id==='auth'?true:x.ok}));setResult(r.ok?'Health endpoint reachable. Complete the NodeMCU checks with a real device.':'Health endpoint returned an error. Check the failing readiness items above.')}catch(e){setChecks(c=>c.map(x=>x.id==='web'?{...x,ok:false}:x));setResult('Could not reach the SYLVIA health endpoint.')}finally{setLoading(false)}};
 useEffect(()=>{run()},[]);
 return <main className="apiPage betaPage"><div className="hero betaHero"><div className="betaHeroCopy"><span className="eyebrow">SYLVIA v0.50 HARDWARE BETA</span><h1>Hosted hardware test center.</h1><p>Use this page to validate the hosted cloud path before connecting a physical NodeMCU/ESP8266.</p></div><div className="heroActions betaHeroActions"><button className="primary betaPreflight" onClick={run} disabled={loading}><RefreshCw size={14}/>{loading?'Checking…':'Run preflight'}</button></div></div>
 <div className="stats betaStats"><Stat icon={<Cloud/>} label="Hosted" value="Beta"/><Stat icon={<Radio/>} label="Transport" value="MQTT / TLS"/><Stat icon={<Cpu/>} label="Target" value="NodeMCU"/><Stat icon={<ShieldCheck/>} label="Security" value="Token + TLS"/></div>
 <div className="panel betaPanel"><div className="sectionHead betaSectionHead"><div><h2>Hosted readiness</h2><span>These checks confirm the cloud side is ready; they do not replace a physical hardware test.</span></div></div><div className="betaChecks">{checks.map(c=><div className="betaCheck" key={c.id}>{c.ok===true?<CheckCircle2 className="ok"/>:c.ok===false?<Circle className="bad"/>:<Circle/>}<div className="betaCheckCopy"><b>{c.label}</b><small>{c.detail}</small></div><span className={c.ok===true?'enabled':c.ok===false?'disabled':''}>{c.ok===true?'Ready':c.ok===false?'Check':'Pending'}</span></div>)}</div>{result&&<div className="notice betaNotice">{result}</div>}</div>
 <div className="apiGrid betaGrid"><div className="panel betaPanel betaSequence"><div className="apiTitle"><Cpu size={17}/><div><b>NodeMCU test sequence</b><span>Run in this order with your physical board.</span></div></div><ol className="betaSteps"><li>Provision or claim a device and obtain its device token.</li><li>Flash the ESP8266 SDK example with your Wi-Fi and MQTT/TLS settings.</li><li>Confirm the device appears <b>Online</b> in Fleet.</li><li>Publish a telemetry value and confirm it appears in Telemetry Analytics.</li><li>Send a command from Device Control and confirm the acknowledgement.</li></ol></div><div className="panel betaPanel betaSafety"><div className="apiTitle"><LockKeyhole size={17}/><div><b>Hosted safety gate</b><span>Never use insecure MQTT for the public beta.</span></div></div><div className="endpointList"><div className="endpoint"><span className="endpointDot"/><div><b>MQTT/TLS</b><small>Use broker TLS with certificate validation.</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Device token</b><small>Keep credentials out of sketches shared publicly.</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Database</b><small>Use PostgreSQL for persistent hosted state.</small></div></div></div></div></div>
 <div className="panel betaFlow"><div className="apiTitle"><Gauge size={17}/><div><b>End-to-end path</b><span>Target behavior for the v0.50 hardware beta.</span></div></div><div className="flowRow betaFlowRow"><span><Wifi/>NodeMCU</span><i>→</i><span><LockKeyhole/>MQTT/TLS</span><i>→</i><span><Database/>SYLVIA</span><i>→</i><span><Gauge/>Dashboard</span><i>↔</i><span><Send/>Command</span></div></div>
 <style jsx>{`
 .betaPage{width:100%;max-width:1240px;margin:0 auto;padding:34px 38px 60px;min-width:0}
 .betaHero{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:26px}
 .betaHeroCopy{min-width:0;max-width:760px}
 .betaHeroCopy h1{line-height:1.08;margin-bottom:8px}
 .betaHeroCopy p{margin:0;max-width:690px;color:#7b8495;font-size:13px;line-height:1.6}
 .betaHeroActions{margin-top:0;flex:0 0 auto}
 .betaPreflight{white-space:nowrap;min-height:40px;justify-content:center}
 .betaStats{grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:26px}
 .betaStats .stat{min-width:0;display:flex;align-items:center;gap:13px;padding:15px 16px}
 .betaStats .statIcon{width:38px;height:38px;min-width:38px;border-radius:10px;background:#f2f5f9;display:grid;place-items:center;color:#475467}
 .betaStats .statIcon svg{width:17px;height:17px}
 .betaStats .stat small,.betaStats .stat b{display:block}
 .betaStats .stat small{font-size:10px;color:#98a2b3;line-height:1.2}
 .betaStats .stat b{font-size:15px;line-height:1.25;margin-top:5px;white-space:normal}
 .betaPanel{min-width:0}
 .betaSectionHead{margin-bottom:17px}
 .betaChecks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .betaCheck{min-width:0;display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid #edf0f4;border-radius:11px;background:#fafbfc}
 .betaCheck>svg{width:18px;height:18px;flex:0 0 18px;color:#98a2b3}
 .betaCheck>svg.ok{color:#16a34a}.betaCheck>svg.bad{color:#dc2626}
 .betaCheckCopy{min-width:0;display:grid;gap:3px;flex:1}
 .betaCheckCopy b{font-size:12px;line-height:1.35}.betaCheckCopy small{font-size:10px;color:#98a2b3;line-height:1.4}
 .betaCheck>span{flex:0 0 auto;margin-left:auto}
 .betaCheck>span.enabled{margin-left:auto}.betaCheck>span.disabled{margin-left:auto;background:#fef2f2;color:#b91c1c;border-radius:99px;padding:5px 8px;font-size:10px}
 .betaNotice{margin-top:13px}
 .betaGrid{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:14px;margin-top:14px}
 .betaSequence,.betaSafety{min-width:0}
 .betaSteps{margin:18px 0 0;padding-left:24px;display:grid;gap:11px;color:#667085;font-size:12px;line-height:1.55}
 .betaSteps li{padding-left:4px}.betaSteps b{color:#344054}
 .betaSafety .endpointList{margin-top:16px;display:grid;gap:2px}
 .betaSafety .endpoint{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #edf0f4}.betaSafety .endpoint:last-child{border-bottom:0}
 .betaSafety .endpointDot{width:7px;height:7px;min-width:7px;border-radius:50%;background:#2563eb;margin-top:5px}
 .betaSafety .endpoint div{min-width:0}.betaSafety .endpoint b,.betaSafety .endpoint small{display:block}.betaSafety .endpoint b{font-size:11px}.betaSafety .endpoint small{font-size:10px;color:#98a2b3;line-height:1.45;margin-top:2px}
 .betaFlow{margin-top:14px;overflow:hidden}
 .betaFlowRow{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px;padding:14px 8px;border:1px solid #edf0f4;border-radius:11px;background:#fafbfc;overflow-x:auto}
 .betaFlowRow span{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:max-content;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #e7eaf0;color:#475467;font-size:10px;font-weight:650;white-space:nowrap}
 .betaFlowRow span svg{width:14px;height:14px;color:#667085}.betaFlowRow i{font-style:normal;color:#98a2b3;font-size:15px;flex:0 0 auto}
 @media(max-width:900px){.betaPage{padding:28px 22px 48px}.betaStats{grid-template-columns:repeat(2,minmax(0,1fr))}.betaGrid{grid-template-columns:1fr}}
 @media(max-width:650px){.betaPage{padding:22px 16px 40px}.betaHero{align-items:stretch;flex-direction:column;gap:18px}.betaHeroActions{width:100%}.betaPreflight{width:100%}.betaStats{grid-template-columns:1fr 1fr;gap:9px}.betaStats .stat{padding:12px}.betaStats .statIcon{width:34px;height:34px;min-width:34px}.betaStats .stat b{font-size:13px}.betaChecks{grid-template-columns:1fr}.betaCheck{padding:12px}.betaFlowRow{justify-content:flex-start}.sectionHead{align-items:flex-start}}
 @media(max-width:420px){.betaStats{grid-template-columns:1fr}.betaPage h1{font-size:27px}.betaHeroCopy p{font-size:12px}.betaCheckCopy small{font-size:9px}}
 `}</style>
 </main>
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="stat"><span className="statIcon">{icon}</span><div><small>{label}</small><b>{value}</b></div></div>}
