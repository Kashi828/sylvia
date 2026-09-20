'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Cloud, Database, Radio, RefreshCw, ShieldCheck, Cpu, Activity } from 'lucide-react';

type Health = {
  ok?: boolean;
  ready?: boolean;
  version?: string;
  deployment?: string;
  checks?: {
    database?: { configured?: boolean; connected?: boolean };
    mqtt?: { configured?: boolean; connected?: boolean; broker?: string };
  };
  diagnostics?: {
    databaseProvider?: string;
    databaseTarget?: { host?: string | null; port?: string | null; database?: string | null };
    nodeEnv?: string;
  };
  timestamp?: string;
};

function Check({ label, detail, ok }: { label: string; detail: string; ok: boolean | null }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:13,padding:16,border:'1px solid #202a38',borderRadius:12,background:'#0b1017'}}>
      {ok === true ? <CheckCircle2 size={19} color="#39d98a"/> : ok === false ? <Circle size={19} color="#ff6b6b"/> : <Activity size={19} color="#75839a"/>}
      <div style={{flex:1,minWidth:0}}>
        <b style={{display:'block'}}>{label}</b>
        <small style={{display:'block',color:'#7f8da3',marginTop:4}}>{detail}</small>
      </div>
      <span style={{fontSize:11,fontWeight:700,color:ok===true?'#39d98a':ok===false?'#ff6b6b':'#75839a'}}>{ok===true?'READY':ok===false?'CHECK':'PENDING'}</span>
    </div>
  );
}

export default function BetaReadiness() {
  const [health,setHealth]=useState<Health|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const run=async()=>{
    setLoading(true); setError('');
    try {
      const response=await fetch('/api/v1/health',{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      setHealth(data);
      if(!response.ok && !data?.checks) setError('Health endpoint returned an unexpected response.');
    } catch {
      setError('Could not reach the SYLVIA health endpoint.');
      setHealth(null);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ void run(); },[]);

  const db=health?.checks?.database;
  const mqtt=health?.checks?.mqtt;
  const web=health?.ok === true;
  const dbReady=Boolean(db?.configured && db?.connected);
  const mqttReady=Boolean(mqtt?.configured && mqtt?.connected);
  const ready=Boolean(health?.ready && web && dbReady && mqttReady);

  return (
    <main style={{minHeight:'100vh',background:'#06080c',color:'#f4f7fb',fontFamily:'system-ui,sans-serif'}}>
      <header style={{height:72,borderBottom:'1px solid #1b2430',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 30px',background:'#090d13'}}>
        <div><b style={{letterSpacing:'.14em'}}>SYLVIA</b><span style={{display:'block',fontSize:10,color:'#738097',letterSpacing:'.12em'}}>HOSTED HARDWARE BETA</span></div>
        <a href="/" style={{color:'#aebbd0',textDecoration:'none',border:'1px solid #263244',borderRadius:9,padding:'8px 12px'}}>Console</a>
      </header>
      <div style={{maxWidth:1050,margin:'0 auto',padding:'44px 22px 70px'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:'.14em',color:'#8ba2ff'}}>READINESS CENTER</span>
            <h1 style={{fontSize:42,lineHeight:1.05,letterSpacing:'-.04em',margin:'9px 0'}}>Hosted cloud is the first hardware test.</h1>
            <p style={{maxWidth:720,color:'#8491a5',lineHeight:1.65}}>Validate the deployed application, persistent PostgreSQL storage and MQTT/TLS transport before flashing a physical NodeMCU or ESP8266.</p>
          </div>
          <button onClick={run} disabled={loading} style={{display:'inline-flex',alignItems:'center',gap:8,border:0,borderRadius:10,padding:'11px 15px',background:'#f2f5ff',color:'#101522',fontWeight:750,cursor:'pointer'}}>
            <RefreshCw size={14}/>{loading?'Checking…':'Run preflight'}
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,margin:'30px 0'}}>
          {[['Deployment',health?.version||'—'],['Database',dbReady?'Ready':'—'],['MQTT',mqttReady?'Ready':'—'],['Overall',ready?'READY':'CHECK']].map(([label,value])=>
            <div key={label} style={{border:'1px solid #202a38',borderRadius:12,padding:15,background:'#0b1017'}}>
              <small style={{color:'#718097'}}>{label}</small><b style={{display:'block',marginTop:7,fontSize:14}}>{value}</b>
            </div>
          )}
        </div>

        <section style={{border:'1px solid #202a38',borderRadius:15,padding:20,background:'#090e15'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:15}}><Cloud size={17}/><div><b>Hosted readiness</b><small style={{display:'block',color:'#718097',marginTop:3}}>All cloud-side gates must be healthy before hardware testing.</small></div></div>
          <div style={{display:'grid',gap:9}}>
            <Check label="SYLVIA web application" detail="Health endpoint is responding." ok={health ? web : null}/>
            <Check label="PostgreSQL persistence" detail={dbReady ? 'Connected and queryable.' : 'Persistent database connection is not ready.'} ok={health ? dbReady : null}/>
            <Check label="MQTT / TLS transport" detail={mqttReady ? 'Broker connection is established.' : 'Broker is not configured or connected.'} ok={health ? mqttReady : null}/>
            <Check label="Readiness gate" detail={ready ? 'Cloud path is ready for the next hardware test.' : 'Do not begin the physical hardware test yet.'} ok={health ? ready : null}/>
          </div>
          {error && <div style={{marginTop:12,padding:12,borderRadius:10,background:'#211114',color:'#ff9c9c',fontSize:12}}>{error}</div>}
        </section>

        <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
          <div style={{border:'1px solid #202a38',borderRadius:15,padding:20,background:'#090e15'}}>
            <div style={{display:'flex',gap:10,alignItems:'center'}}><Database size={17}/><b>Database</b></div>
            <div style={{marginTop:15,color:'#8794a8',fontSize:12,lineHeight:1.8}}>
              <div>Provider: <b style={{color:'#c7d0de'}}>{health?.diagnostics?.databaseProvider||'—'}</b></div>
              <div>Host: <b style={{color:'#c7d0de'}}>{health?.diagnostics?.databaseTarget?.host||'—'}</b></div>
              <div>Database: <b style={{color:'#c7d0de'}}>{health?.diagnostics?.databaseTarget?.database||'—'}</b></div>
            </div>
          </div>
          <div style={{border:'1px solid #202a38',borderRadius:15,padding:20,background:'#090e15'}}>
            <div style={{display:'flex',gap:10,alignItems:'center'}}><Radio size={17}/><b>MQTT transport</b></div>
            <div style={{marginTop:15,color:'#8794a8',fontSize:12,lineHeight:1.8}}>
              <div>Configured: <b style={{color:'#c7d0de'}}>{mqtt?.configured?'Yes':'No'}</b></div>
              <div>Connected: <b style={{color:'#c7d0de'}}>{mqtt?.connected?'Yes':'No'}</b></div>
              <div>Broker: <b style={{color:'#c7d0de'}}>{mqtt?.broker?'Configured':'—'}</b></div>
            </div>
          </div>
        </section>

        <section style={{marginTop:12,border:'1px solid #202a38',borderRadius:15,padding:20,background:'#090e15'}}>
          <div style={{display:'flex',gap:10,alignItems:'center'}}><ShieldCheck size={17}/><div><b>Next hardware sequence</b><small style={{display:'block',color:'#718097',marginTop:3}}>Only proceed after the readiness gate shows READY.</small></div></div>
          <ol style={{color:'#aeb9ca',fontSize:12,lineHeight:1.9,paddingLeft:20,marginBottom:0}}>
            <li>Register a real device and save its one-time token.</li>
            <li>Configure ESP8266 Wi-Fi, MQTT broker and TLS certificate.</li>
            <li>Publish heartbeat and telemetry.</li>
            <li>Confirm Online state and telemetry in the console.</li>
            <li>Send a command and verify the command acknowledgement.</li>
          </ol>
        </section>

        <footer style={{marginTop:18,color:'#657289',fontSize:10}}>Version: {health?.version||'unknown'} · Deployment: {health?.deployment||'unknown'} · Checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'not checked'}</footer>
      </div>
    </main>
  );
}
