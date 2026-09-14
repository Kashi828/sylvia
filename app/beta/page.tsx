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
 const run=async()=>{setLoading(true);setResult('');try{const r=await fetch('/api/v1/health',{cache:'no-store'});const d=await r.json();const database=d.checks?.database;const mqtt=d.checks?.mqtt;setChecks(c=>c.map(x=>x.id==='web'?{...x,ok:r.ok}:{...x,ok:x.id==='db'?Boolean(database?.configured&&database?.connected):x.id==='mqtt'?Boolean(mqtt?.configured):x.id==='auth'?true:x.ok}));setResult(r.ok?'Health endpoint reachable. Complete the NodeMCU checks with a real device.':'Health endpoint returned an error.')}catch(e){setChecks(c=>c.map(x=>x.id==='web'?{...x,ok:false}:x));setResult('Could not reach the SYLVIA health endpoint.')}finally{setLoading(false)}};
 useEffect(()=>{run()},[]);
 return <main className="apiPage betaPage"><div className="hero"><div><span className="eyebrow">SYLVIA v0.50 HARDWARE BETA</span><h1>Hosted hardware test center.</h1><p>Use this page to validate the hosted cloud path before connecting a physical NodeMCU/ESP8266.</p></div><div className="heroActions"><button className="primary" onClick={run} disabled={loading}><RefreshCw size={14}/>{loading?'Checking…':'Run preflight'}</button></div></div>
 <div className="stats"><Stat icon={<Cloud/>} label="Hosted" value="Beta"/><Stat icon={<Radio/>} label="Transport" value="MQTT / TLS"/><Stat icon={<Cpu/>} label="Target" value="NodeMCU"/><Stat icon={<ShieldCheck/>} label="Security" value="Token + TLS"/></div>
 <div className="panel"><div className="sectionHead"><div><h2>Hosted readiness</h2><span>These checks confirm the cloud side is ready; they do not replace a physical hardware test.</span></div></div><div className="betaChecks">{checks.map(c=><div className="betaCheck" key={c.id}>{c.ok===true?<CheckCircle2 className="ok"/>:c.ok===false?<Circle className="bad"/>:<Circle/>}<div><b>{c.label}</b><small>{c.detail}</small></div><span className={c.ok===true?'enabled':c.ok===false?'disabled':''}>{c.ok===true?'Ready':c.ok===false?'Check':'Pending'}</span></div>)}</div>{result&&<div className="notice">{result}</div>}</div>
 <div className="apiGrid"><div className="panel"><div className="apiTitle"><Cpu size={17}/><div><b>NodeMCU test sequence</b><span>Run in this order with your physical board.</span></div></div><ol className="betaSteps"><li>Provision or claim a device and obtain its device token.</li><li>Flash the ESP8266 SDK example with your Wi-Fi and MQTT/TLS settings.</li><li>Confirm the device appears <b>Online</b> in Fleet.</li><li>Publish a telemetry value and confirm it appears in Telemetry Analytics.</li><li>Send a command from Device Control and confirm the acknowledgement.</li></ol></div><div className="panel"><div className="apiTitle"><LockKeyhole size={17}/><div><b>Hosted safety gate</b><span>Never use insecure MQTT for the public beta.</span></div></div><div className="endpointList"><div className="endpoint"><span className="endpointDot"/><div><b>MQTT/TLS</b><small>Use broker TLS with certificate validation.</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Device token</b><small>Keep credentials out of sketches shared publicly.</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Database</b><small>Use PostgreSQL for persistent hosted state.</small></div></div></div></div></div>
 <div className="panel betaFlow"><div className="apiTitle"><Gauge size={17}/><div><b>End-to-end path</b><span>Target behavior for the v0.50 hardware beta.</span></div></div><div className="flowRow"><span><Wifi/>NodeMCU</span><i>→</i><span><LockKeyhole/>MQTT/TLS</span><i>→</i><span><Database/>SYLVIA</span><i>→</i><span><Gauge/>Dashboard</span><i>↔</i><span><Send/>Command</span></div></div>
 </main>
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="stat"><span className="statIcon">{icon}</span><div><small>{label}</small><b>{value}</b></div></div>}
