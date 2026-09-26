'use client';
import { useEffect, useMemo, useState } from 'react';
import AlertsPanel from '@/components/AlertsPanel';
import EventCenter from '@/components/EventCenter';
import NotificationCenter from '@/components/NotificationCenter';
import NotificationSubscriptions from '@/components/NotificationSubscriptions';
import { Activity, Cpu, LayoutDashboard, Radio, Zap, Settings, Plus, Gauge, Trash2, RotateCcw, KeyRound, Plug, Moon, Sun, Code2, Boxes, RefreshCw, Bot, Clock3, Network, Users, ShieldCheck, UserPlus, LogOut, Wifi, WifiOff, ToggleRight, Copy, Terminal, Link2, Hash, ExternalLink, Send, Power, Play, Bell, MoreHorizontal, ServerCog, LineChart, SlidersHorizontal, Save, X } from 'lucide-react';

type Device={id:number;name:string;type:string;templateId:number;token:string;tokenPreview?:string;tokenGeneration?:number;tokenRevoked?:boolean;tokenRotatedAt?:string|null;tokenLastAuthenticatedAt?:string|null;temperature:number;online:boolean;battery:number;lastSeen:number};
type Template={id:number;name:string;description:string;protocol:string;created:number};
type Stream={id:number;remoteId?:string;name:string;deviceId:number;type:'Number'|'Boolean'|'String';unit:string;value:string|number|boolean;}
type Widget={id:number;title:string;kind:'Gauge'|'Value'|'Switch'|'Chart';streamId:number};
type Rule={id:number;name:string;streamId:number;operator:'>'|'<'|'='|'!=';threshold:string;action:'Event'|'Switch device'|'Set datastream';enabled:boolean};
type ApiKey={id:string|number;name:string;token?:string;tokenPreview?:string;created:number;revoked?:boolean;lastUsedAt?:string|null};
type Webhook={id:number;name:string;url:string;event:string;enabled:boolean};
type Schedule={id:number;name:string;time:string;days:string;action:string;enabled:boolean};
type ZyraConfig={enabled:boolean;mode:'Bridge'|'Webhook';endpoint:string;label:string;project:string};
type Member={id:string;name:string;email:string;role:'Owner'|'Admin'|'Builder'|'Viewer';status:'Active'|'Invited'};
type HistoryPoint={ts:number;value:number};

const seedTemplates:Template[]=[
 {id:1,name:'ESP32 Device',description:'ESP32 Wi-Fi hardware device',protocol:'REST + MQTT',created:Date.now()},
 {id:2,name:'Smart Sensor',description:'Generic telemetry sensor',protocol:'REST',created:Date.now()},
 {id:3,name:'Relay Controller',description:'Binary actuator template',protocol:'REST + MQTT',created:Date.now()}
];
const seedDevices:Device[]=[];
const seedStreams:Stream[]=[];
const seedWidgets:Widget[]=[];
const seedRules:Rule[]=[];
const seedApiKeys:ApiKey[]=[{id:1,name:'Development key',token:'syl_dev_7f3a9c2e1b',created:Date.now()}];
const seedWebhooks:Webhook[]=[{id:1,name:'Local event receiver',url:'https://example.com/sylvia-hook',event:'device.offline',enabled:true}];
const seedSchedules:Schedule[]=[{id:1,name:'Morning telemetry check',time:'08:00',days:'Mon–Fri',action:'Trigger event review',enabled:true},{id:2,name:'Night profile',time:'22:30',days:'Every day',action:'Pause non-critical automations',enabled:false}];
const seedZyra:ZyraConfig={enabled:false,mode:'Bridge',endpoint:'',label:'ZYRA AI Agent',project:'ZYRA AI Ecosystem'};

function readStore<T>(key:string,fallback:T):T{if(typeof window==='undefined')return fallback;try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeStore(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function currentDevicesFromStorage():Device[]{return readStore<Device[]>('sylvia.devices',[])}

export default function Home(){
 const [devices,setDevices]=useState<Device[]>(seedDevices); const [templates,setTemplates]=useState<Template[]>(seedTemplates); const [streams,setStreams]=useState<Stream[]>(seedStreams); const [widgets,setWidgets]=useState<Widget[]>(seedWidgets); const [rules,setRules]=useState<Rule[]>(seedRules); const [schedules,setSchedules]=useState<Schedule[]>(seedSchedules); const [apiKeys,setApiKeys]=useState<ApiKey[]>(seedApiKeys); const [webhooks,setWebhooks]=useState<Webhook[]>(seedWebhooks);
 const [zyraConfig,setZyraConfig]=useState<ZyraConfig>(seedZyra); const [members,setMembers]=useState<Member[]>([]); const [currentRole,setCurrentRole]=useState<Member['role']>('Viewer');
 const [projectName,setProjectName]=useState('SYLVIA Cloud Project'); const [darkMode,setDarkMode]=useState(false); const [hydrated,setHydrated]=useState(false); const [tab,setTab]=useState('Overview'); const [notice,setNotice]=useState('');
 const [selectedDevice,setSelectedDevice]=useState<Device|null>(null); const [authUser,setAuthUser]=useState<{name:string;email:string;role:string}|null>(null); const [selectedStream,setSelectedStream]=useState<Stream|null>(null); const [history,setHistory]=useState<Record<number,HistoryPoint[]>>({});
 const [showDeviceForm,setShowDeviceForm]=useState(false),[showTemplateForm,setShowTemplateForm]=useState(false),[showStreamForm,setShowStreamForm]=useState(false),[showRuleForm,setShowRuleForm]=useState(false),[showApiKey,setShowApiKey]=useState(false);
 const [deviceDraft,setDeviceDraft]=useState({name:'',templateId:1}); const [templateDraft,setTemplateDraft]=useState({name:'',description:'',protocol:'REST'}); const [streamDraft,setStreamDraft]=useState({name:'',deviceId:1,type:'Number' as Stream['type'],unit:'°C'});
 const [ruleDraft,setRuleDraft]=useState({name:'',streamId:1,operator:'>' as Rule['operator'],threshold:'30',action:'Event' as Rule['action']}); const [apiKeyName,setApiKeyName]=useState('Production integration'); const [newApiToken,setNewApiToken]=useState(''); const [apiResult,setApiResult]=useState(''); const [apiLoading,setApiLoading]=useState(false); const [writeValue,setWriteValue]=useState('25');
 useEffect(()=>{
   fetch('/api/auth/me').then(r=>r.json()).then(d=>{if(d.authenticated){setAuthUser(d.user);setCurrentRole(d.user.role)}}).catch(()=>{});
   fetch('/api/v1/members',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json().catch(()=>null);if(Array.isArray(data?.members))setMembers(data.members)}).catch(()=>{});
   fetch('/api/v1/api-keys',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json().catch(()=>null);if(!Array.isArray(data?.keys))return;setApiKeys(data.keys.map((item:{id:string;name:string;tokenPreview:string;createdAt:string;revoked:boolean;lastUsedAt?:string|null})=>({id:item.id,name:item.name,tokenPreview:item.tokenPreview,created:Date.parse(item.createdAt),revoked:item.revoked,lastUsedAt:item.lastUsedAt||null} as ApiKey)));}).catch(()=>{});
   const storedDevices=readStore<Device[]>('sylvia.devices',seedDevices);
   const legacyFakeTokens=new Set(['syl_dev_living_7f3a','syl_dev_workshop_81b2','syl_dev_garden_4a19']);
   const legacyFakeNames=new Set(['Living Room','Workshop','Garden']);
   const cleanDevices=storedDevices.filter(d=>!legacyFakeTokens.has(d.token)&&!legacyFakeNames.has(d.name));
   const validDeviceIds=new Set(cleanDevices.map(d=>d.id));
   const storedStreams=readStore<Stream[]>('sylvia.streams',seedStreams).filter(s=>validDeviceIds.has(s.deviceId));
   const validStreamIds=new Set(storedStreams.map(s=>s.id));
   setDevices(cleanDevices);
   setTemplates(readStore('sylvia.templates',seedTemplates));
   setStreams(storedStreams);
   setWidgets(readStore<Widget[]>('sylvia.widgets',seedWidgets).filter(w=>validStreamIds.has(w.streamId)));
   setRules(readStore<Rule[]>('sylvia.rules',seedRules).filter(rule=>validStreamIds.has(rule.streamId)));
   setSchedules(readStore('sylvia.schedules',seedSchedules)); setApiKeys(readStore('sylvia.apiKeys',seedApiKeys)); setWebhooks(readStore('sylvia.webhooks',seedWebhooks)); setProjectName(readStore('sylvia.projectName','SYLVIA Cloud Project')); setDarkMode(readStore('sylvia.darkMode',false)); setHydrated(true);
   setZyraConfig(readStore('sylvia.zyra',seedZyra)); setHistory(readStore('sylvia.history',{}));
   fetch('/api/v1/datastreams',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json().catch(()=>null);if(!Array.isArray(data?.datastreams))return;setStreams(current=>{const remote=data.datastreams.map((item:{id:string;name:string;deviceId:string;type:'Number'|'Boolean'|'String';unit?:string;value?:number|boolean|string|null;lastOccurredAt?:string|null})=>({id:Math.abs(Array.from(String(item.id)).reduce((a,ch)=>a+ch.charCodeAt(0),0)),remoteId:String(item.id),name:item.name,deviceId:Number(item.deviceId),type:item.type,unit:item.unit||'',value:item.value??(item.type==='Boolean'?false:item.type==='String'?'ready':0)} as Stream));const keys=new Set(remote.map(s=>s.deviceId+'|'+s.name));return [...remote,...current.filter(s=>!keys.has(s.deviceId+'|'+s.name))]});}).catch(()=>{});

   fetch('/api/v1/devices',{cache:'no-store'}).then(async response=>{
     if(!response.ok)return;
     const data=await response.json().catch(()=>null);
     const remote=Array.isArray(data?.devices)?data.devices:[];
     if(!remote.length && data?.persistent===true){setDevices([]);return;}
     if(data?.persistent===true){
       setDevices(remote.map((item:{id:number;name:string;type:string;online:boolean;temperature:number;battery:number;lastSeen:string;tokenPreview?:string})=>{
         const local=cleanDevices.find(d=>d.id===Number(item.id));
         return {
           id:Number(item.id), name:item.name, type:item.type, templateId:local?.templateId||1,
           token:local?.token||'', tokenPreview:item.tokenPreview, tokenGeneration:local?.tokenGeneration, tokenRevoked:local?.tokenRevoked, tokenRotatedAt:local?.tokenRotatedAt, tokenLastAuthenticatedAt:local?.tokenLastAuthenticatedAt, temperature:Number(item.temperature||0), online:Boolean(item.online),
           battery:Number(item.battery||0), lastSeen:item.lastSeen?Date.parse(item.lastSeen):0
         } as Device;
       }));
     }
   }).catch(()=>{});
 },[]);
 useEffect(()=>{
   if(!hydrated)return;
   let active=true;
   const syncFleet=async()=>{
     try{
       const response=await fetch('/api/v1/fleet',{cache:'no-store'});
       if(!response.ok)return;
       const data=await response.json();
       const fleet=Array.isArray(data?.devices)?data.devices:[];
       if(!active)return;
       setDevices(current=>current.map(device=>{
         const remote=fleet.find((item:{deviceId?:string})=>String(item.deviceId)===String(device.id));
         if(!remote)return device;
         return {
           ...device,
           online:remote.lifecycle==='online',
           lastSeen:remote.lastSeen?Date.parse(String(remote.lastSeen)):device.lastSeen,
           temperature:Number.isFinite(Number(remote.temperature))?Number(remote.temperature):device.temperature,
           battery:Number.isFinite(Number(remote.battery))?Number(remote.battery):device.battery,
         };
       }));
       if(fleet.length){
         const local=currentDevicesFromStorage();
         const remoteDevices=fleet.map((remote:{deviceId:string;name:string;transport?:string;temperature?:number;battery?:number;online?:boolean;lastSeen?:string})=>{
           const localDevice=local.find(device=>String(device.id)===String(remote.deviceId));
           return {
             id:Number(remote.deviceId),
             name:String(remote.name||remote.deviceId),
             type:String(remote.transport||'ESP32 Device').toUpperCase()==='MQTT'?'ESP32 / MQTT':'ESP32 Device',
             templateId:1,
             token:localDevice?.token||'',
             tokenPreview:localDevice?.tokenPreview, tokenGeneration:localDevice?.tokenGeneration, tokenRevoked:localDevice?.tokenRevoked, tokenRotatedAt:localDevice?.tokenRotatedAt, tokenLastAuthenticatedAt:localDevice?.tokenLastAuthenticatedAt,
             temperature:Number(remote.temperature||0),
             online:remote.online===true||remote.lifecycle==='online',
             battery:Number(remote.battery||0),
             lastSeen:remote.lastSeen?Date.parse(String(remote.lastSeen)):0,
           } as Device;
         });
         const byId=new Map(remoteDevices.map(device=>[String(device.id),device]));
         local.filter(device=>!byId.has(String(device.id))).forEach(device=>byId.set(String(device.id),device));
         setDevices(Array.from(byId.values()));
       }
     }catch{}
   };
   void syncFleet();
   const timer=setInterval(syncFleet,5000);
   return()=>{active=false;clearInterval(timer)};
 },[hydrated]);
 useEffect(()=>{if(hydrated)writeStore('sylvia.devices',devices)},[devices,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.templates',templates)},[templates,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.streams',streams)},[streams,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.widgets',widgets)},[widgets,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.rules',rules)},[rules,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.schedules',schedules)},[schedules,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.webhooks',webhooks)},[webhooks,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.projectName',projectName)},[projectName,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.darkMode',darkMode)},[darkMode,hydrated]);
 useEffect(()=>{if(hydrated)writeStore('sylvia.zyra',zyraConfig)},[zyraConfig,hydrated]); useEffect(()=>{if(hydrated)writeStore('sylvia.history',history)},[history,hydrated]);

 useEffect(()=>{setStreams(ss=>ss.map(s=>{const d=devices.find(x=>x.id===s.deviceId);if(!d)return s;if(s.name==='Temperature')return {...s,value:Number(d.temperature.toFixed(1))};if(s.name==='Battery')return {...s,value:d.battery};if(s.name==='Online')return {...s,value:String(d.online)};return s;}))},[devices]);
 useEffect(()=>{if(!hydrated)return; setHistory(prev=>{const now=Date.now(); const next={...prev}; streams.forEach(st=>{if(st.type!=='Number')return; const v=Number(st.value); if(!Number.isFinite(v))return; const arr=[...(next[st.id]||[])]; const last=arr[arr.length-1]; if(!last || now-last.ts>=1800){arr.push({ts:now,value:v}); next[st.id]=arr.slice(-60)}}); return next})},[streams,hydrated]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2200);return()=>clearTimeout(t)},[notice]);
 const online=devices.filter(d=>d.online).length; const deviceMap=useMemo(()=>new Map(devices.map(d=>[d.id,d])),[devices]); const streamMap=useMemo(()=>new Map(streams.map(s=>[s.id,s])),[streams]);
 const resetWorkspace=()=>{setDevices([]);setStreams([]);setWidgets([]);setRules([]);setHistory({});setNotice('Workspace cleared')};
 const addCustomDevice=async()=>{if(!deviceDraft.name.trim())return;const t=templates.find(x=>x.id===deviceDraft.templateId)||templates[0];try{const response=await fetch('/api/v1/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:deviceDraft.name.trim(),type:t?.name||'ESP32 Device'})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error||'Device registration failed');const registered=data.device as Device;const d:Device={...registered,templateId:t?.id||1,token:String(data.token||''),tokenPreview:registered.tokenPreview,temperature:0,online:false,battery:0,lastSeen:registered.lastSeen?Date.parse(String(registered.lastSeen)):0};setDevices(x=>[...x,d]);setDeviceDraft({name:'',templateId:templates[0]?.id||1});setShowDeviceForm(false);setNotice('Device registered — save the token and connect the hardware')}catch(error){setNotice(error instanceof Error?error.message:'Device registration failed')}};
 
 const updateStreamValue=(id:number,value:string|number)=>{setStreams(ss=>ss.map(s=>s.id===id?{...s,value}:s));setNotice('Datastream value updated')};
 const addTemplate=()=>{if(!templateDraft.name.trim())return;setTemplates(t=>[...t,{id:Date.now(),name:templateDraft.name.trim(),description:templateDraft.description.trim()||'Custom device template',protocol:templateDraft.protocol,created:Date.now()}]);setTemplateDraft({name:'',description:'',protocol:'REST'});setShowTemplateForm(false);setNotice('Template created')};
 const addStream=async()=>{if(!streamDraft.name.trim()||!streamDraft.deviceId)return;try{const response=await fetch('/api/v1/datastreams',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:String(streamDraft.deviceId),name:streamDraft.name.trim(),type:streamDraft.type,unit:streamDraft.type==='Number'?streamDraft.unit:''})});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'Datastream creation failed');const remote=data?.datastream;const local:Stream={id:Math.abs(Array.from(String(remote?.id||Date.now())).reduce((a,ch)=>a+ch.charCodeAt(0),0)),name:remote?.name||streamDraft.name.trim(),deviceId:Number(remote?.deviceId||streamDraft.deviceId),type:remote?.type||streamDraft.type,unit:remote?.unit||'',remoteId:remote?.id?String(remote.id):undefined,value:remote?.value??(remote?.type==='Boolean'?false:remote?.type==='String'?'ready':0)};setStreams(s=>[...s.filter(x=>!(x.deviceId===local.deviceId&&x.name===local.name)),local]);setStreamDraft({name:'',deviceId:devices[0]?.id||1,type:'Number',unit:'°C'});setShowStreamForm(false);setNotice(data?.persistent?'Datastream persisted in PostgreSQL':'Datastream created')}catch(error){setNotice(error instanceof Error?error.message:'Datastream creation failed')}};
 const deleteStream=async(id:number)=>{const stream=streams.find(x=>x.id===id);try{if(stream){const response=await fetch('/api/v1/datastreams?id='+encodeURIComponent(String(stream.remoteId||stream.id)),{method:'DELETE'});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'Datastream deletion failed');}setStreams(s=>s.filter(x=>x.id!==id));setWidgets(w=>w.filter(x=>x.streamId!==id));setRules(r=>r.filter(x=>x.streamId!==id));setNotice('Datastream removed from cloud')}catch(error){setNotice(error instanceof Error?error.message:'Datastream deletion failed')}};
 const addWidget=(kind:Widget['kind'])=>{const source=streams[0];if(!source)return;setWidgets(w=>[...w,{id:Date.now(),title:`${source.name} ${kind.toLowerCase()}`,kind,streamId:source.id}]);setNotice(`${kind} widget added`)}; const updateWidget=(id:number,patch:Partial<Widget>)=>setWidgets(ws=>ws.map(w=>w.id===id?{...w,...patch}:w));
 const addRule=()=>{if(!ruleDraft.name.trim())return;setRules(r=>[...r,{id:Date.now(),...ruleDraft}]);setRuleDraft({name:'',streamId:streams[0]?.id||1,operator:'>',threshold:'30',action:'Event'});setShowRuleForm(false);setNotice('Automation created')};
 const testRule=(r:Rule)=>setNotice(`${r.name}: simulation passed`); const toggleRule=(id:number)=>setRules(rs=>rs.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));
 const createApiKey=async()=>{try{const response=await fetch('/api/v1/api-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:apiKeyName.trim()||'Project key'})});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'API key creation failed');setApiKeys(k=>[{id:String(data.key.id),name:data.key.name,token:data.token,tokenPreview:data.key.tokenPreview,created:Date.parse(data.key.createdAt),revoked:false,lastUsedAt:null},...k]);setNewApiToken(String(data.token||''));setApiKeyName('Production integration');setNotice('Persistent API key created — copy it now')}catch(error){setNotice(error instanceof Error?error.message:'API key creation failed')}}; const deleteApiKey=async(id:string|number)=>{try{const response=await fetch('/api/v1/api-keys?id='+encodeURIComponent(String(id)),{method:'DELETE'});const data=await response.json().catch(()=>null);if(!response.ok||data?.revoked===false)throw new Error(data?.error||'API key revocation failed');setApiKeys(k=>k.map(x=>x.id===id?{...x,revoked:true,token:undefined}:x));setNotice('API key revoked')}catch(error){setNotice(error instanceof Error?error.message:'API key revocation failed')}};
 const createWebhook=()=>setWebhooks(w=>[...w,{id:Date.now(),name:`Webhook ${w.length+1}`,url:'https://example.com/sylvia-hook',event:'device.status',enabled:true}]);
 const nav=[['Overview',LayoutDashboard],['Workspace',Users],['Devices',Cpu],['Templates',Boxes],['Datastreams',Radio],['Dashboard',Gauge],['Telemetry',LineChart],['Alerts',Bell],['Automations',Zap],['Schedules',Clock3],['Live Monitor',RefreshCw],['Event Center',Activity],['Notifications',Bell],['Subscriptions',Users],['Developer API',Code2],['Connectivity',Network],['ZYRA AI Bridge',Bot],['Settings',Settings]] as const;
 return <main className={darkMode?'dark':''}><header><div className="accountStrip">{authUser ? <span>Signed in as <b>{authUser.name}</b> · {authUser.role}</span> : <span>Cloud workspace · PostgreSQL authentication available</span>}</div><div className="brand"><div className="logo">S</div><div><b>SYLVIA</b><span>IOT PLATFORM · v0.60.0 · REST + MQTT</span></div></div><div className="headerRight"><div className="status"><i/> Cloud workspace online</div><button className="themeToggle" onClick={()=>setDarkMode(v=>!v)} aria-label="Toggle theme">{darkMode?<Sun size={16}/>:<Moon size={16}/>}</button></div></header><div className="layout"><aside><nav>{nav.map(([label,Icon])=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}><Icon size={16}/><span>{label}</span></button>)}</nav><div className="sideNote"><b>{projectName}</b><small>{devices.length} devices · {online} online</small><button className="reset" onClick={resetWorkspace}><RotateCcw size={12}/> Clear workspace</button></div></aside><section className="content">
 {tab==='Overview'&&<><div className="hero"><div><span className="eyebrow">COMMAND CENTER</span><h1>Connected world, one workspace.</h1><p>Connect, monitor and control your IoT devices from one workspace.</p></div><div className="heroActions"><button className="secondary" onClick={()=>setShowTemplateForm(true)}><Boxes size={15}/> New template</button><button className="primary" onClick={()=>setShowDeviceForm(true)}><Plus size={15}/> Add device</button></div></div><div className="stats"><Stat label="Devices" value={devices.length}/><Stat label="Online" value={online}/><Stat label="Datastreams" value={streams.length}/><Stat label="Automations" value={rules.length}/></div><div className="sectionHead"><div><h2>Live devices</h2><span>Live telemetry appears when connected devices publish data.</span></div><button className="secondary" onClick={()=>setTab('Devices')}>View all</button></div><div className="deviceGrid">{devices.length?devices.slice(0,6).map(d=><DeviceCard key={d.id} d={d} onInspect={()=>setSelectedDevice(d)}/>):<div className="panel emptyDeviceState"><Cpu size={22}/><div><b>No devices connected</b><span>Register a device and connect your hardware to start receiving live telemetry.</span></div><button className="primary" onClick={()=>setShowDeviceForm(true)}><Plus size={14}/> Register device</button></div>}</div></>}
 {tab==='Workspace'&&<WorkspacePanel projectName={projectName} setProjectName={setProjectName} members={members} setMembers={setMembers} currentRole={currentRole} setCurrentRole={setCurrentRole} setNotice={setNotice}/>}
 {tab==='Devices'&&<DevicesPanel devices={devices} templates={templates} onAdd={()=>setShowDeviceForm(true)} onInspect={setSelectedDevice} />} 
 {tab==='Templates'&&<TemplatesPanel templates={templates} devices={devices} onAdd={()=>setShowTemplateForm(true)}/>} 
 {tab==='Datastreams'&&<Datastreams streams={streams} devices={devices} onDelete={deleteStream} onAdd={()=>setShowStreamForm(true)} onSelect={setSelectedStream}/>} 
 {tab==='Dashboard'&&<DashboardPanel widgets={widgets} streams={streams} onAdd={addWidget} onDelete={id=>setWidgets(w=>w.filter(x=>x.id!==id))} onUpdate={updateWidget} setNoticeForDashboard={setNotice}/>}
 {tab==='Telemetry'&&<TelemetryPanel devices={devices} streams={streams} history={history} setHistory={setHistory} setNotice={setNotice}/>} 
 {tab==='Alerts'&&<AlertsPanel/>}
 {tab==='Automations'&&<AutomationPanel rules={rules} streams={streams} devices={devices} onAdd={()=>setShowRuleForm(true)} onDelete={id=>setRules(r=>r.filter(x=>x.id!==id))} onToggle={toggleRule} onTest={testRule}/>}
 {tab==='Schedules'&&<SchedulesPanel schedules={schedules} devices={devices} onToggle={()=>{}} onRun={()=>{}} onAdd={()=>{}}/>}
 {tab==='Live Monitor'&&<LiveMonitor devices={devices} streams={streams} apiKeys={apiKeys} setNotice={setNotice}/>}
 {tab==='Event Center'&&<EventCenter/>} 
 {tab==='Notifications'&&<NotificationCenter/>}
 {tab==='Subscriptions'&&<div className="apiPage"><div className="hero"><div><span className="eyebrow">NOTIFICATION ROUTING</span><h1>Project-aware subscriptions.</h1><p>Choose which event types and severities reach each user and project inbox.</p></div></div><NotificationSubscriptions/><div className="panel"><div className="apiTitle"><Bell size={17}/><div><b>Routing engine</b><span>Every event is matched against enabled subscriptions before entering a scoped inbox.</span></div></div><div className="connectionSteps"><div><span>01</span><b>Event</b><small>Telemetry or webhook event arrives.</small></div><div><span>02</span><b>Match</b><small>Kind and severity are evaluated.</small></div><div><span>03</span><b>Scope</b><small>User and project determine recipients.</small></div><div><span>04</span><b>Deliver</b><small>Only matching inboxes receive it.</small></div></div></div></div>}
 {tab==='Connectivity'&&<ConnectivityPanel devices={devices} streams={streams} apiKeys={apiKeys} setNotice={setNotice}/>}
 {tab==='Developer API'&&<ApiPanel devices={devices} streams={streams} apiKeys={apiKeys} webhooks={webhooks} result={apiResult} setResult={setApiResult} loading={apiLoading} setLoading={setApiLoading} writeValue={writeValue} setWriteValue={setWriteValue} onCreateKey={()=>setShowApiKey(true)}/>} 
 {tab==='ZYRA AI Bridge'&&<ZyraPanel config={zyraConfig} setConfig={setZyraConfig} devices={devices} streams={streams} apiKeys={apiKeys} setNotice={setNotice}/>} 
 {tab==='Settings'&&<SettingsPanel projectName={projectName} setProjectName={setProjectName} apiKeys={apiKeys} onCreateKey={()=>setShowApiKey(true)} onDeleteKey={deleteApiKey} webhooks={webhooks} onAddWebhook={createWebhook} onToggleWebhook={id=>setWebhooks(w=>w.map(x=>x.id===id?{...x,enabled:!x.enabled}:x))} onDeleteWebhook={id=>setWebhooks(w=>w.filter(x=>x.id!==id))} reset={resetWorkspace} zyraConfig={zyraConfig} setZyraConfig={setZyraConfig}/>} 
 </section></div>{notice&&<div className="toast">{notice}</div>}
 {showDeviceForm&&<Modal title="Provision device" eyebrow="NEW DEVICE" close={()=>setShowDeviceForm(false)}><p className="modalHint">Register a device identity for hardware connection. Telemetry remains empty until the device actually connects.</p><div className="form"><label>Name<input autoFocus value={deviceDraft.name} onChange={e=>setDeviceDraft({...deviceDraft,name:e.target.value})} placeholder="e.g. Office Gateway"/></label><label>Template<select value={deviceDraft.templateId} onChange={e=>setDeviceDraft({...deviceDraft,templateId:Number(e.target.value)})}>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button className="primary full" onClick={addCustomDevice}>Register device</button></div></Modal>}
 {showTemplateForm&&<Modal title="Create device template" eyebrow="TEMPLATE" close={()=>setShowTemplateForm(false)}><div className="form"><label>Name<input autoFocus value={templateDraft.name} onChange={e=>setTemplateDraft({...templateDraft,name:e.target.value})} placeholder="e.g. ESP32 Weather Station"/></label><label>Description<input value={templateDraft.description} onChange={e=>setTemplateDraft({...templateDraft,description:e.target.value})} placeholder="What this template represents"/></label><label>Protocol<select value={templateDraft.protocol} onChange={e=>setTemplateDraft({...templateDraft,protocol:e.target.value})}><option>REST</option><option>REST + MQTT</option><option>MQTT</option></select></label><button className="primary full" onClick={addTemplate}>Create template</button></div></Modal>}
 {showStreamForm&&<Modal title="Create datastream" eyebrow="DATA MODEL" close={()=>setShowStreamForm(false)}><div className="form"><label>Name<input autoFocus value={streamDraft.name} onChange={e=>setStreamDraft({...streamDraft,name:e.target.value})} placeholder="Temperature"/></label><div className="conditionRow"><label>Device<select value={streamDraft.deviceId} onChange={e=>setStreamDraft({...streamDraft,deviceId:Number(e.target.value)})}>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Type<select value={streamDraft.type} onChange={e=>setStreamDraft({...streamDraft,type:e.target.value as Stream['type']})}><option>Number</option><option>Boolean</option><option>String</option></select></label><label>Unit<input value={streamDraft.unit} onChange={e=>setStreamDraft({...streamDraft,unit:e.target.value})} disabled={streamDraft.type!=='Number'} placeholder="°C"/></label></div><button className="primary full" onClick={addStream}>Create datastream</button></div></Modal>}
 {showRuleForm&&<Modal title="Create automation" eyebrow="RULE ENGINE" close={()=>setShowRuleForm(false)}><div className="form"><label>Name<input autoFocus value={ruleDraft.name} onChange={e=>setRuleDraft({...ruleDraft,name:e.target.value})} placeholder="High temperature alert"/></label><div className="conditionRow"><label>Stream<select value={ruleDraft.streamId} onChange={e=>setRuleDraft({...ruleDraft,streamId:Number(e.target.value)})}>{streams.map(s=><option key={s.id} value={s.id}>{deviceMap.get(s.deviceId)?.name} · {s.name}</option>)}</select></label><label>Op<select value={ruleDraft.operator} onChange={e=>setRuleDraft({...ruleDraft,operator:e.target.value as Rule['operator']})}><option>{'>'}</option><option>{'<'}</option><option>=</option><option>!=</option></select></label><label>Threshold<input value={ruleDraft.threshold} onChange={e=>setRuleDraft({...ruleDraft,threshold:e.target.value})}/></label></div><label>Action<select value={ruleDraft.action} onChange={e=>setRuleDraft({...ruleDraft,action:e.target.value as Rule['action']})}><option>Event</option><option>Switch device</option><option>Set datastream</option></select></label><button className="primary full" onClick={addRule}>Create automation</button></div></Modal>}
 {showApiKey&&<Modal title={newApiToken?'API key created':'Create API key'} eyebrow="ACCESS" close={()=>{setShowApiKey(false);setNewApiToken('')}}><p className="modalHint">Project API keys are stored as hashes. The full secret is shown only immediately after creation.</p><div className="form">{newApiToken?<><label>New secret token<input className="premiumField mono" value={newApiToken} readOnly/></label><button className="secondary full" onClick={async()=>{try{await navigator.clipboard?.writeText(newApiToken);setNotice('API token copied')}catch{setNotice('Copy unavailable')}}}><Copy size={14}/> Copy token</button></>:<><label>Key name<input autoFocus value={apiKeyName} onChange={e=>setApiKeyName(e.target.value)} placeholder="Production integration"/></label><button className="primary full" onClick={createApiKey}>Generate API key</button></>}</div></Modal>}
 {selectedDevice&&<DeviceDetailPanel device={selectedDevice} streams={streams} onClose={()=>setSelectedDevice(null)} onUpdateStream={updateStreamValue} setNotice={setNotice}/>}
 {selectedStream&&<Modal title={selectedStream.name} eyebrow="DATASTREAM" close={()=>setSelectedStream(null)}><div className="detailGrid"><div><span>Device</span><b>{deviceMap.get(selectedStream.deviceId)?.name||'Unknown'}</b></div><div><span>Type</span><b>{selectedStream.type}</b></div><div><span>Current value</span><b>{String(selectedStream.value)} {selectedStream.unit}</b></div><div><span>Endpoint</span><b className="mono">POST /api/v1/datastreams/{selectedStream.id}/value</b></div></div><div className="buttonRow"><input className="compactInput" value={writeValue} onChange={e=>setWriteValue(e.target.value)} aria-label="value"/><button className="primary" onClick={async()=>{try{const key=apiKeys[0]?.token||'';const r=await fetch(`/api/v1/datastreams/${selectedStream.id}/value`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({value:selectedStream.type==='Number'?Number(writeValue):writeValue})});const j=await r.json();setNotice(j.ok?'Value sent':'API error')}catch{setNotice('API unavailable')}}}><Send size={13}/> Send through API</button></div></Modal>}
 </main>
}


function DeviceDetailPanel({device,streams,onClose,onUpdateStream,setNotice}:{device:Device;streams:Stream[];onClose:()=>void;onUpdateStream:(id:number,value:string|number)=>void;setNotice:(v:string)=>void}){
 const [view,setView]=useState<'Overview'|'Telemetry'|'Commands'>('Overview');
 const [command,setCommand]=useState('');
 const [commandPayload,setCommandPayload]=useState('');
 const [commandHistory,setCommandHistory]=useState<Array<{id:string;command:string;status:string;createdAt:string;ackedAt:string|null}>>([]);
 const [liveState,setLiveState]=useState<Record<string, string|number|boolean|null>>({});
 const [stateConnected,setStateConnected]=useState(false);
 useEffect(()=>{
   const source=new EventSource(`/api/v1/devices/state-events?deviceId=${device.id}`);
   const onState=(event:MessageEvent)=>{try{const data=JSON.parse(event.data);setLiveState(data.state||{});setStateConnected(true)}catch{}};
   source.addEventListener('device.state.updated',onState);
   source.addEventListener('ready',()=>setStateConnected(true));
   source.onerror=()=>setStateConnected(false);
   return()=>source.close();
 },[device.id]);
 const deviceStreams=streams.filter(s=>s.deviceId===device.id);
 const loadCommandHistory=async()=>{if(!device.token)return;try{const r=await fetch(`/api/v1/devices/${device.id}/commands?history=true&limit=10`,{headers:{Authorization:`Bearer ${device.token}`},cache:'no-store'});const j=await r.json();if(r.ok&&Array.isArray(j.commands))setCommandHistory(j.commands)}catch{}};
 useEffect(()=>{void loadCommandHistory();const timer=setInterval(()=>void loadCommandHistory(),10000);const source=new EventSource(`/api/v1/devices/command-events?deviceId=${device.id}`);const onCommand=(event:MessageEvent)=>{try{const data=JSON.parse(event.data);setCommandHistory(current=>{const next={id:data.commandId,command:data.command,status:data.status,createdAt:data.updatedAt,ackedAt:data.status==='acked'||data.status==='failed'?data.updatedAt:null};const merged=[next,...current.filter(item=>item.id!==data.commandId)];return merged.slice(0,10)});if(data.status==='acked')setNotice(`Command ${data.commandId} acknowledged`);else if(data.status==='failed')setNotice(`Command ${data.commandId} failed`)}catch{}};source.addEventListener('device.command.updated',onCommand);return()=>{clearInterval(timer);source.close()}},[device.id,device.token]);
 const sendCommand=async()=>{if(!command.trim()||!device.token)return;let payload:unknown=null;if(commandPayload.trim()){try{payload=JSON.parse(commandPayload)}catch{setNotice('Payload must be valid JSON');return}}try{const r=await fetch(`/api/v1/devices/${device.id}/command`,{method:'POST',headers:{Authorization:`Bearer ${device.token}`,'Content-Type':'application/json'},body:JSON.stringify({command:command.trim(),payload})});const j=await r.json();setNotice(j.ok?`Command ${j.commandId||''} queued for ${device.name}`:(j.error||'Command failed'));if(j.ok){setCommand('');setCommandPayload('');void loadCommandHistory()}}catch{setNotice('Command API unavailable')}};
 const copy=async(text:string)=>{try{await navigator.clipboard?.writeText(text);setNotice('Copied to clipboard')}catch{setNotice('Copy unavailable')}};
 return <Modal title={device.name} eyebrow="DEVICE CONTROL CENTER" close={onClose}>
  <div className="deviceControlHeader"><div className="detailHero"><div className="deviceIcon big"><Cpu size={22}/></div><div><b>{device.type}</b><span>{device.online?'Connected':'Offline'} · Template #{device.templateId}</span></div></div><span className={device.online?'power on':'power'} aria-label={device.online?'Device online':'Device offline'} title={device.online?'Connected':'Waiting for connection'}><Power size={17}/></span></div>
  <div className="deviceTabs">{(['Overview','Telemetry','Commands'] as const).map(t=><button key={t} className={view===t?'active':''} onClick={()=>setView(t)}>{t}</button>)}</div>
  {view==='Overview'&&(
   <>
    <div className="stateSyncBadge">
     <span className={stateConnected?'liveDot':'liveDot offline'}/>
     <b>{stateConnected?'Realtime state connected':'Waiting for realtime state'}</b>
     <small>{Object.keys(liveState).length} reported fields</small>
    </div>
    <div className="detailGrid premiumDetailGrid">
     <div><span>Temperature</span><b>{device.online?device.temperature.toFixed(1):'—'}{device.online?' °C':''}</b></div>
     <div><span>Battery</span><b>{device.online?device.battery+'%':'—'}</b></div>
     <div><span>Status</span><b className={device.online?'statusGood':'statusDim'}>{device.online?'Online':'Offline'}</b></div>
     <div><span>Last seen</span><b>{new Date(device.lastSeen).toLocaleTimeString()}</b></div>
    </div>
    <div className="provisionBox">
     <div><b>Device token</b><span className="mono">{device.token||device.tokenPreview||'Token available only on the device registration session'}</span></div>
     {device.token&&<button className="secondary" onClick={()=>copy(device.token)}><Copy size={13}/> Copy token</button>}
    </div>
    {Object.keys(liveState).length>0&&(
     <div className="provisionBox stateReportBox">
      <div><b>Device-reported state</b><span className="mono">{Object.entries(liveState).map(([k,v])=>k+': '+String(v)).join(' · ')}</span></div>
     </div>
    )}
    {(liveState.sdkVersion||liveState.wifiRssi!==undefined||liveState.uptimeMs!==undefined||liveState.protocolVersion)&&(
     <div className="panel" style={{marginTop:12}}>
      <div className="apiTitle"><ServerCog size={17}/><div><b>Hardware diagnostics</b><span>Live diagnostics reported by the Sylvia SDK heartbeat.</span></div></div>
      <div className="detailGrid premiumDetailGrid">
       <div><span>SDK</span><b className="mono">{String(liveState.sdkVersion||'—')}</b></div>
       <div><span>Wi-Fi RSSI</span><b>{liveState.wifiRssi!==undefined?String(liveState.wifiRssi)+' dBm':'—'}</b></div>
       <div><span>Uptime</span><b>{liveState.uptimeMs!==undefined?(Math.floor(Number(liveState.uptimeMs)/1000)+' s'):'—'}</b></div>
       <div><span>Protocol</span><b className="mono">{String(liveState.protocolVersion||'—')}</b></div>
       <div><span>Transport</span><b className="mono">{String(liveState.transport||'—')}</b></div>
       <div><span>Capabilities</span><b className="mono">{String(liveState.capabilities||'—')}</b></div>
       <div><span>Command persistence</span><b>{liveState.commandPersistence===true?'Enabled':liveState.commandPersistence===false?'Unavailable':'—'}</b></div>
       <div><span>Recovery</span><b>{liveState.commandRecoveryPending===true?'Pending':liveState.commandRecoveryPending===false?'Checked':'—'}</b></div>
       <div><span>Wi-Fi sessions</span><b>{liveState.wifiSessionCount!==undefined?String(liveState.wifiSessionCount):'—'}</b></div>
       <div><span>Connection</span><b className={stateConnected?'statusGood':'statusDim'}>{stateConnected?'Realtime':'Waiting'}</b></div>
       <div><span>Last command</span><b className={liveState.lastCommandOk===true?'statusGood':liveState.lastCommandId?'statusDim':'statusDim'}>{liveState.lastCommandId?String(liveState.lastCommandOk===true?'Success':liveState.lastCommandOk===false?'Failed':'Unknown'):'—'}</b></div>
      </div>
      {liveState.lastCommandId&&<div className="provisionBox" style={{marginTop:10}}><div><b>Command outcome</b><span className="mono">{String(liveState.lastCommandId)} · {String(liveState.lastCommandMessage||'No message')}</span></div></div>}
     </div>
    )}
    <div className="stateConfirmation">
     <span className="liveDot"/>
     <div><b>Physical state correlation</b><small>{liveState.lastCommandId?'Latest device command: '+String(liveState.lastCommandId):'Waiting for a command-correlated heartbeat.'}</small></div>
    </div>
   </>
  )}
  {view==='Telemetry'&&(
   <div className="controlList">
    {deviceStreams.map(s=>(
     <div className="controlRow" key={s.id}>
      <div><b>{s.name}</b><span>{s.type}{s.unit?' · '+s.unit:''}</span></div>
      {s.type==='Boolean'
       ? <button className={String(s.value)==='true'?'switch on':'switch'} onClick={()=>onUpdateStream(s.id,String(s.value)==='true'?'false':'true')} aria-label={'Toggle '+s.name}><i/></button>
       : <div className="controlInput"><input value={String(s.value)} onChange={e=>onUpdateStream(s.id,s.type==='Number'?Number(e.target.value):e.target.value)}/><button className="secondary" onClick={()=>setNotice(s.name+' updated')}>Apply</button></div>}
     </div>
    ))}
    {deviceStreams.length===0&&<div className="dashboardEmpty"><div><b>No datastreams attached</b><span>Create a datastream for this device to control values here.</span></div></div>}
   </div>
  )}

  {view==='Commands'&&(
   <div className="commandPanel">
    <div className="commandPreset">
     <button className="secondary" onClick={()=>{setCommand('restart');setCommandPayload('');setNotice('Command prepared')}}><RefreshCw size={14}/> Restart</button>
     <button className="secondary" onClick={()=>{setCommand('sync');setCommandPayload('');setNotice('Command prepared')}}><RefreshCw size={14}/> Sync</button>
     <button className="secondary" onClick={()=>{setCommand('identify');setCommandPayload('');setNotice('Command prepared')}}><Bot size={14}/> Identify</button>
     <button className="secondary" onClick={()=>{setCommand('digital_write');setCommandPayload('{\"value\":1}');setNotice('GPIO ON command prepared')}}><Power size={14}/> GPIO ON</button>
     <button className="secondary" onClick={()=>{setCommand('digital_write');setCommandPayload('{\"value\":0}');setNotice('GPIO OFF command prepared')}}><Power size={14}/> GPIO OFF</button>
    </div>
    <label className="commandInput">
     <span>Custom command</span>
     <div>
      <input value={command} onChange={e=>setCommand(e.target.value)} placeholder="e.g. digital_write"/>
      <button className="primary" onClick={sendCommand}><Send size={14}/> Send</button>
     </div>
    </label>
    <label className="commandInput">
     <span>Payload JSON</span>
     <div><input value={commandPayload} onChange={e=>setCommandPayload(e.target.value)} placeholder='{"pin":2,"value":1}'/></div>
    </label>
    <div className="commandHint">
     <Terminal size={15}/>
     <span>Commands are persisted in PostgreSQL. MQTT devices receive them over MQTT; REST devices claim them by polling. Acknowledgements update the persistent command record.</span>
    </div>
    {commandHistory.length>0&&(
     <div className="controlList" style={{marginTop:14}}>
      <b>Recent command state</b>
      {commandHistory.slice(0,6).map(item=>(
       <div className="controlRow" key={item.id}>
        <div><b>{item.command}</b><span className="mono">{item.id}</span></div>
        <div><b>{item.status}</b><span>{item.ackedAt?new Date(item.ackedAt).toLocaleTimeString():new Date(item.createdAt).toLocaleTimeString()}</span></div>
       </div>
      ))}
     </div>
    )}
   </div>
  )}
 </Modal>
}

function WorkspacePanel({projectName,setProjectName,members,setMembers,currentRole,setCurrentRole,setNotice}:{projectName:string;setProjectName:(v:string)=>void;members:Member[];setMembers:(v:Member[])=>void;currentRole:Member['role'];setCurrentRole:(v:Member['role'])=>void;setNotice:(v:string)=>void}){
 const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [role,setRole]=useState<Member['role']>('Viewer'); const canManage=currentRole==='Owner'||currentRole==='Admin';
 const refresh=async()=>{try{const r=await fetch('/api/v1/members',{cache:'no-store'});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Unable to load members');setMembers(Array.isArray(d?.members)?d.members:[]);setNotice('Workspace membership refreshed')}catch(error){setNotice(error instanceof Error?error.message:'Unable to load members')}};
 const invite=async()=>{if(!email.trim()||!canManage)return;try{const r=await fetch('/api/v1/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim()||'Pending member',email:email.trim(),role})});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Invitation failed');setMembers([...members,d.member]);setName('');setEmail('');setNotice('Invitation created')}catch(error){setNotice(error instanceof Error?error.message:'Invitation failed')}};
 const changeRole=async(id:string,nextRole:Member['role'])=>{try{const r=await fetch('/api/v1/members',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,role:nextRole})});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Role update failed');setMembers(members.map(m=>m.id===id?d.member:m));setNotice('Member role updated')}catch(error){setNotice(error instanceof Error?error.message:'Role update failed')}};
 return <div className="apiPage"><div className="hero"><div><span className="eyebrow">TEAM WORKSPACE</span><h1>Organize projects, people and permissions.</h1><p>Workspace members and roles are now persisted in PostgreSQL for the signed-in project.</p></div><div className="heroActions"><span className="enabled"><ShieldCheck size={14}/> {currentRole}</span></div></div><div className="stats"><Stat label="Workspace" value="1"/><Stat label="Members" value={members.length}/><Stat label="Active" value={members.filter(m=>m.status==='Active').length}/><Stat label="Role" value={currentRole}/></div><div className="panel"><div className="sectionHead"><div><h2>Project identity</h2><span>Cloud workspace identity is kept separate from device and integration credentials.</span></div></div><div className="settingsGrid premiumForm"><label>Project name<input className="premiumField" value={projectName} onChange={e=>setProjectName(e.target.value)}/></label><label>Workspace ID<input className="premiumField" value="sylvia-local-workspace" readOnly/></label><label>Deployment model<select className="premiumField" defaultValue="Managed Cloud"><option>Local / Self-hosted</option><option>Managed Cloud</option></select></label><label>Authentication<select className="premiumField" defaultValue="Persistent PostgreSQL session"><option>Persistent PostgreSQL session</option><option>Future OAuth / OIDC</option></select></label></div></div><div className="apiGrid"><div className="panel"><div className="apiTitle"><Users size={17}/><div><b>Members & roles</b><span>Owner, Admin, Builder and Viewer permissions.</span></div></div>{members.map(m=><div className="keyRow" key={m.id}><div><b>{m.name} · {m.role}</b><small>{m.email} · {m.status}</small></div>{canManage&&m.role!=='Owner'&&<select className="roleSelect" value={m.role} onChange={e=>void changeRole(m.id,e.target.value as Member['role'])}><option>Admin</option><option>Builder</option><option>Viewer</option></select>}</div>)}{!members.length&&<div className="empty"><span>No workspace members found.</span><button className="secondary" onClick={refresh}>Refresh</button></div>}</div><div className="panel"><div className="apiTitle"><UserPlus size={17}/><div><b>Invite collaborator</b><span>Creates a persistent workspace invitation record.</span></div></div><label>Name<input className="premiumField" value={name} onChange={e=>setName(e.target.value)} placeholder="Team member"/></label><label>Email<input className="premiumField" value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@example.com"/></label><label>Role<select className="premiumField" value={role} onChange={e=>setRole(e.target.value as Member['role'])}><option>Viewer</option><option>Builder</option><option>Admin</option></select></label><button className="primary full" disabled={!canManage||!email.trim()} onClick={()=>void invite()}><UserPlus size={14}/> {canManage?'Create invitation':'Admin access required'}</button></div></div><div className="panel"><div className="sectionHead"><div><h2>Session controls</h2><span>Identity is verified by the persistent session cookie.</span></div><button className="secondary" onClick={()=>void refresh()}><RefreshCw size={14}/> Refresh membership</button></div><div className="endpoint"><span className="endpointDot"/><div><b>Permission model</b><small>Viewer: read · Builder: edit devices/automations · Admin: manage workspace · Owner: full control</small></div></div></div></div>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function Modal({title,eyebrow,close,children}:{title:string;eyebrow:string;close:()=>void;children:React.ReactNode}){return <div className="overlay" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="iconButton" onClick={close}>×</button></div>{children}</div></div>}

function LiveMonitor({devices,streams,apiKeys,setNotice}:{devices:Device[];streams:Stream[];apiKeys:ApiKey[];setNotice:(v:string)=>void}){
 const [remote,setRemote]=useState<any[]>([]); const [loading,setLoading]=useState(false); const [lastSync,setLastSync]=useState('Not connected');
 const token=apiKeys[0]?.token||'';
 const load=async()=>{setLoading(true);try{const r=await fetch('/api/v1/devices',{headers:{Authorization:`Bearer ${token}`}});const j=await r.json();if(j.devices)setRemote(j.devices);setLastSync(new Date().toLocaleTimeString());}catch{}finally{setLoading(false)}};
 useEffect(()=>{load();const t=setInterval(load,3000);return()=>clearInterval(t)},[token]);
 const syncOne=async(d:Device)=>{try{await fetch(`/api/v1/devices/${d.id}/heartbeat`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});const s=streams.find(x=>x.deviceId===d.id&&x.name==='Temperature');if(s)await fetch(`/api/v1/datastreams/${s.id}/value`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({value:d.temperature})});setNotice(`${d.name} synced to API`);load()}catch{setNotice('API sync failed')}};
 const syncAll=async()=>{for(const d of devices.slice(0,10))await syncOne(d)};
 return <div className="livePage"><div className="sectionHead"><div><span className="eyebrow">REALTIME CONTROL PLANE</span><h2>Live monitor</h2><span>Watch the cloud-side device state and push simulator telemetry into the API.</span></div><div className="buttonRow"><span className="liveStatus"><i/> {lastSync}</span><button className="secondary" onClick={load}><RefreshCw size={14}/> {loading?'Refreshing…':'Refresh'}</button><button className="primary" onClick={syncAll}><ServerCog size={14}/> Sync simulator</button></div></div><div className="liveGrid">{remote.map(d=><article className="panel liveCard" key={d.id}><div className="cardTop"><div className="deviceIcon"><Cpu size={18}/></div><span className={d.online?'online':'offline'}>{d.online?<Wifi size={13}/>:<WifiOff size={13}/>} {d.online?'Online':'Offline'}</span></div><h3>{d.name}</h3><p>{d.type}</p><div className="liveMetric"><strong>{Number(d.temperature).toFixed(1)}<small>°C</small></strong><span>{d.battery}% battery</span></div><div className="bar"><span style={{width:`${Math.max(0,Math.min(100,d.battery))}%`}}/></div><div className="liveFoot"><span>Device ID {d.id}</span><button className="mini" onClick={()=>syncOne(devices.find(x=>x.id===d.id)||devices[0])}>Send heartbeat</button></div></article>)}{remote.length===0&&<div className="panel emptyLive"><ServerCog size={22}/><b>No cloud devices loaded</b><span>Use your API key and sync the local simulator.</span></div>}</div><div className="panel"><div className="sectionHead"><div><h2>Connection flow</h2><span>SYLVIA device protocol is designed around a simple cloud contract.</span></div></div><div className="connectionSteps"><div><span>01</span><b>Provision</b><small>Device receives a unique token.</small></div><div><span>02</span><b>Heartbeat</b><small>Device announces liveness.</small></div><div><span>03</span><b>Publish</b><small>Datastreams receive telemetry.</small></div><div><span>04</span><b>Automate</b><small>Rules react to incoming values.</small></div></div></div></div>
}

function DeviceCard({d,onInspect}:{d:Device;onInspect:()=>void}){return <article className="card clickable" onClick={onInspect}><div className="cardTop"><div className="deviceIcon"><Cpu size={19}/></div><span className={d.online?'online':'offline'}>{d.online?<Wifi size={14}/>:<WifiOff size={14}/>} {d.online?'Online':'Offline'}</span></div><h3>{d.name}</h3><p>{d.type}</p><div className="value">{d.online?d.temperature.toFixed(1):'—'}<small>{d.online?' °C':''}</small></div><div className="bar"><span style={{width:`${d.battery}%`}}/></div><footer><span>{d.online?`Battery ${d.battery}%`:'Awaiting telemetry'}</span><span>{d.online?'Telemetry live':'Waiting for connection'}</span></footer></article>}
function DevicesPanel({devices,templates,onAdd,onInspect}:{devices:Device[];templates:Template[];onAdd:()=>void;onInspect:(d:Device)=>void}){return <><div className="sectionHead"><div><h2>Devices</h2><span>Register devices and connect ESP32, ESP8266, Arduino, Raspberry Pi or gateways.</span></div><div className="buttonRow"><button className="primary" onClick={onAdd}><Plus size={14}/> Register device</button></div></div><div className="deviceGrid">{devices.length?devices.map(d=><DeviceCard key={d.id} d={d} onInspect={()=>onInspect(d)}/>):<div className="panel emptyDeviceState"><Cpu size={22}/><div><b>No devices registered</b><span>Register your first hardware device to receive live telemetry and commands.</span></div><button className="primary" onClick={onAdd}><Plus size={14}/> Register device</button></div>}</div><div className="panel"><div className="sectionHead"><div><h2>Device connection model</h2><span>Every device gets a unique token and template.</span></div></div><div className="connectionSteps"><div><span>01</span><b>Provision</b><small>Choose a template and generate an identity token.</small></div><div><span>02</span><b>Connect</b><small>Use REST today or MQTT in the next backend milestone.</small></div><div><span>03</span><b>Stream</b><small>Publish values into datastreams and dashboards.</small></div><div><span>04</span><b>Automate</b><small>Rules, events and webhooks react to telemetry.</small></div></div></div></>}
function TemplatesPanel({templates,devices,onAdd}:{templates:Template[];devices:Device[];onAdd:()=>void}){return <><div className="sectionHead"><div><h2>Device templates</h2><span>Define reusable device types, protocols and connection intent.</span></div><button className="primary" onClick={onAdd}><Plus size={14}/> New template</button></div><div className="templateGrid">{templates.map(t=><article className="card" key={t.id}><div className="templateIcon"><Boxes size={19}/></div><h3>{t.name}</h3><p>{t.description}</p><div className="templateMeta"><span>{t.protocol}</span><span>{devices.filter(d=>d.templateId===t.id).length} devices</span></div></article>)}</div></>}
function Datastreams({streams,devices,onDelete,onAdd,onSelect}:{streams:Stream[];devices:Device[];onDelete:(id:number)=>void;onAdd:()=>void;onSelect:(s:Stream)=>void}){return <><div className="sectionHead"><div><h2>Datastream registry</h2><span>Channels are persisted in PostgreSQL and feed telemetry, dashboards and automations.</span></div><button className="primary" onClick={onAdd}><Plus size={15}/> New datastream</button></div><div className="streamTable"><div className="streamRow streamHeader"><span>Name</span><span>Device</span><span>Type</span><span>Value</span><span/></div>{streams.map(s=><div className="streamRow clickable" key={s.id} onClick={()=>onSelect(s)}><div><b>{s.name}</b><small>{s.unit||'No unit'}</small></div><span>{devices.find(d=>d.id===s.deviceId)?.name||'Unknown'}</span><span className="pill">{s.type}</span><strong>{String(s.value)} {s.unit}</strong><button className="trash" onClick={e=>{e.stopPropagation();onDelete(s.id)}}><Trash2 size={15}/></button></div>)}</div></>}
function DashboardPanel({widgets,streams,onAdd,onDelete,onUpdate,setNoticeForDashboard}:{widgets:Widget[];streams:Stream[];onAdd:(k:Widget['kind'])=>void;onDelete:(id:number)=>void;onUpdate:(id:number,patch:Partial<Widget>)=>void;setNoticeForDashboard?:(v:string)=>void}){
 const [switchBusy,setSwitchBusy]=useState<number|null>(null);
 const sendSwitch=async(stream:Stream)=>{if(!stream.remoteId||stream.type!=='Boolean'){return}const next=String(stream.value)!=='true';setSwitchBusy(stream.id);try{let pin=2;try{const stateResponse=await fetch(`/api/v1/devices/${stream.deviceId}`,{cache:'no-store'});const stateData=await stateResponse.json().catch(()=>null);const configuredPin=Number(stateData?.state?.relayPin);if(Number.isInteger(configuredPin)&&configuredPin>=0&&configuredPin<=16)pin=configuredPin}catch{}const response=await fetch(`/api/v1/devices/${stream.deviceId}/command`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'digital_write',payload:{pin,value:next?1:0,datastreamId:stream.remoteId}})});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'Command failed');setNoticeForDashboard?.(data?.dispatchState==='queued'?'Switch command queued':'Switch command sent')}catch(error){setNoticeForDashboard?.(error instanceof Error?error.message:'Command failed')}finally{setSwitchBusy(null)}};
 const [cloudHistory,setCloudHistory]=useState<Record<number,HistoryPoint[]>>({});
 useEffect(()=>{const deviceIds=Array.from(new Set(streams.filter(s=>s.type==='Boolean'&&s.remoteId).map(s=>s.deviceId)));const sources:EventSource[]=[];for(const deviceId of deviceIds){const source=new EventSource(`/api/v1/devices/state-events?deviceId=${deviceId}`);const handleState=(event:MessageEvent)=>{try{const payload=JSON.parse(event.data) as {type?:string;deviceId?:string;state?:Record<string,unknown>};if(String(payload.deviceId)!==String(deviceId)||!payload.state)return;setStreams(current=>current.map(stream=>{if(stream.deviceId!==deviceId)return stream;const key=String(stream.name).toLowerCase().replace(/[^a-z0-9]/g,'');const named=Object.entries(payload.state||{}).find(([k])=>k.toLowerCase().replace(/[^a-z0-9]/g,'')===key)?.[1];const relay=payload.state?.relayOn;const value=typeof named==='boolean'?named:typeof relay==='boolean'?relay:undefined;return typeof value==='boolean'?{...stream,value}:stream;}));}catch{}};source.addEventListener('device.state.updated',handleState);sources.push(source)}return()=>sources.forEach(source=>source.close())},[streams.length]);
 useEffect(()=>{let active=true;const load=async()=>{const numeric=streams.filter(s=>s.type==='Number'&&s.remoteId);const results=await Promise.all(numeric.map(async s=>{try{const r=await fetch(`/api/v1/telemetry?deviceId=${s.deviceId}&streamId=${encodeURIComponent(String(s.remoteId))}`,{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok||!Array.isArray(j?.samples))return [s.id,[]] as const;const points=j.samples.filter((x:{value?:unknown})=>typeof x.value==='number').map((x:{value:number;timestamp:string})=>({ts:Date.parse(x.timestamp),value:x.value})).filter((x:HistoryPoint)=>Number.isFinite(x.ts)).sort((a:HistoryPoint,b:HistoryPoint)=>a.ts-b.ts).slice(-30);return [s.id,points] as const}catch{return [s.id,[]] as const}}));if(active)setCloudHistory(Object.fromEntries(results));};void load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer)}},[streams]);
 const [editing,setEditing]=useState<Widget|null>(null);
 const currentStreams=streams.length?streams:[];
 return <div className="dashboardStudio">
  <div className="dashboardBuilderHeader"><div><span className="eyebrow">DASHBOARD STUDIO</span><h2>Build your command center</h2><span>Compose live widgets, choose their datastreams and tune the presentation without code.</span></div><div className="buttonRow"><button className="secondary" onClick={()=>onAdd('Value')}><Plus size={13}/> Value</button><button className="secondary" onClick={()=>onAdd('Gauge')}><Gauge size={13}/> Gauge</button><button className="secondary" onClick={()=>onAdd('Chart')}><LineChart size={13}/> Chart</button><button className="primary" onClick={()=>onAdd('Switch')}><ToggleRight size={13}/> Switch</button></div></div>
  {widgets.length===0?<div className="dashboardEmpty"><div><b>Your dashboard is empty</b><span>Add a widget above to start building your control room.</span></div></div>:<div className="studioGrid">{widgets.map(w=>{const stream=streams.find(s=>s.id===w.streamId); return <article className="studioWidget" key={w.id}>
    <div className="studioWidgetHead"><div><span className="widgetKicker">{w.kind}</span><h3>{w.title}</h3>{stream&&<small>{stream.name} · {String(stream.value)} {stream.unit}</small>}</div><div className="widgetActions"><button className="iconButton" onClick={()=>setEditing(w)} aria-label="Configure widget"><SlidersHorizontal size={14}/></button><button className="trash" onClick={()=>onDelete(w.id)} aria-label="Delete widget"><Trash2 size={14}/></button></div></div>
    <WidgetVisual widget={w} stream={stream} history={cloudHistory[w.streamId]||[]} onSwitch={sendSwitch} switchBusy={switchBusy}/>
   </article>})}</div>}
  {editing&&<div className="overlay" onMouseDown={()=>setEditing(null)}><div className="modal widgetEditor" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span className="eyebrow">WIDGET CONFIGURATION</span><h2>{editing.title}</h2></div><button className="iconButton" onClick={()=>setEditing(null)}><X size={16}/></button></div><div className="form">
    <label>Widget title<input className="premiumField" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
    <label>Widget type<select className="premiumField" value={editing.kind} onChange={e=>setEditing({...editing,kind:e.target.value as Widget['kind']})}><option>Value</option><option>Gauge</option><option>Chart</option><option>Switch</option></select></label>
    <label>Datastream<select className="premiumField" value={editing.streamId} onChange={e=>setEditing({...editing,streamId:Number(e.target.value)})}>{currentStreams.map(s=><option key={s.id} value={s.id}>{s.name} · {s.type}</option>)}</select></label>
    <div className="editorPreview"><span>Live preview</span><WidgetVisual widget={editing} stream={currentStreams.find(s=>s.id===editing.streamId)} history={cloudHistory[editing.streamId]||[]} onSwitch={sendSwitch} switchBusy={switchBusy}/></div>
    <button className="primary full" onClick={()=>{onUpdate(editing.id,{title:editing.title,kind:editing.kind,streamId:editing.streamId});setEditing(null)}}><Save size={14}/> Save widget</button>
   </div></div></div>}
 </div>}

function WidgetVisual({widget,stream,history,onSwitch,switchBusy}:{widget:Widget;stream?:Stream;history?:HistoryPoint[];onSwitch?:(stream:Stream)=>void;switchBusy?:number|null}){
 if(!stream)return <div className="widgetMissing">Datastream unavailable</div>;
 if(widget.kind==='Gauge'){const n=Number(stream.value)||0;const pct=Math.max(0,Math.min(100,(n/50)*100));return <div className="widgetGauge"><div className="gaugeRing" style={{'--pct':`${pct}%`} as React.CSSProperties}><strong>{stream.value}</strong><span>{stream.unit}</span></div><small>Live value</small></div>}
 if(widget.kind==='Chart'){const cloudPoints=history&&history.length>1?history.map(p=>p.value):[];const base=Number(stream.value)||20;const points=cloudPoints.length>1?cloudPoints:Array.from({length:18},(_,i)=>base+(Math.sin(i*0.8)*2)+(i%3-1)*0.45);const min=Math.min(...points),max=Math.max(...points);const poly=points.map((v,i)=>`${(i/(points.length-1))*100},${100-((v-min)/Math.max(1,max-min))*82-9}`).join(' ');return <div className="chartWidget"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Telemetry trend"><polyline points={poly} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg><div className="chartMeta"><b>{stream.value}{stream.unit}</b><span>{cloudPoints.length>1?`${cloudPoints.length} persisted samples`:'Waiting for cloud history'}</span></div></div>}
 if(widget.kind==='Switch'){const on=String(stream.value)==='true';return <div className="widgetSwitch"><button className={on?'switchBig on':'switchBig'} onClick={()=>onSwitch?.(stream)} disabled={switchBusy===stream.id} aria-label="Cloud device state switch"><span/></button><div><b>{on?'ON':'OFF'}</b><small>{stream.name}</small></div></div>}
 return <div className="widgetValue"><strong>{String(stream.value)}</strong><span>{stream.unit||'Live value'}</span></div>
}

function AutomationPanel({rules,streams,devices,onAdd,onDelete,onToggle,onTest}:{rules:Rule[];streams:Stream[];devices:Device[];onAdd:()=>void;onDelete:(id:number)=>void;onToggle:(id:number)=>void;onTest:(r:Rule)=>void}){
 const [items,setItems]=useState<any[]>([]); const [runs,setRuns]=useState<any[]>([]); const [open,setOpen]=useState(false); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
 const [draft,setDraft]=useState({name:"",streamId:0,operator:">",threshold:"30",action:"event"});
 const load=async()=>{setLoading(true);try{const [a,b]=await Promise.all([fetch("/api/v1/automations",{cache:"no-store"}),fetch("/api/v1/automation-runs?limit=8",{cache:"no-store"})]);const aj=await a.json().catch(()=>null);const bj=await b.json().catch(()=>null);if(a.ok)setItems(Array.isArray(aj?.automations)?aj.automations:[]);if(b.ok)setRuns(Array.isArray(bj?.runs)?bj.runs:[])}catch{setMessage("Automation API unavailable")}finally{setLoading(false)}};
 useEffect(()=>{if(!draft.streamId){const first=streams.find(s=>s.remoteId);if(first)setDraft(d=>({...d,streamId:first.id}))}},[streams,draft.streamId]);
 useEffect(()=>{void load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[]);
 const create=async()=>{const stream=streams.find(s=>s.id===draft.streamId);if(!draft.name.trim()||!stream?.remoteId){setMessage("Choose a persisted datastream");return}try{const action=draft.action==="device_command"?"device_command":"event";const r=await fetch("/api/v1/automations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:draft.name.trim(),deviceId:String(stream.deviceId),streamId:String(stream.remoteId),operator:draft.operator,threshold:Number(draft.threshold),action,command:action==="device_command"?"digital_write":null,payload:action==="device_command"?{pin:2,value:1}:{},cooldownSeconds:300,enabled:true})});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||"Automation creation failed");setOpen(false);setMessage("Automation saved to PostgreSQL");setDraft({name:"",streamId:stream.id,operator:">",threshold:"30",action:"event"});await load()}catch(error){setMessage(error instanceof Error?error.message:"Automation creation failed")}};
 const toggle=async(item:any)=>{try{const r=await fetch("/api/v1/automations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,enabled:!item.enabled})});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||"Automation update failed");await load()}catch(error){setMessage(error instanceof Error?error.message:"Automation update failed")}};
 const remove=async(item:any)=>{try{const r=await fetch("/api/v1/automations?id="+encodeURIComponent(String(item.id)),{method:"DELETE"});const j=await r.json().catch(()=>null);if(!r.ok||j?.deleted===false)throw new Error(j?.error||"Automation deletion failed");await load()}catch(error){setMessage(error instanceof Error?error.message:"Automation deletion failed")}};
 return <div className="apiPage"><div className="sectionHead"><div><span className="eyebrow">CLOUD AUTOMATION ENGINE · v0.56.0</span><h2>Telemetry rules that execute real device actions.</h2><span>Rules are persisted in PostgreSQL and linked to persistent command execution.</span></div><button className="primary" onClick={()=>setOpen(v=>!v)}><Plus size={15}/>{open?"Close":"Create automation"}</button></div>
 {message&&<div className="panel"><b>{message}</b></div>}
 {open&&<div className="panel"><div className="form"><label>Name<input autoFocus value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Tank level control"/></label><div className="conditionRow"><label>Datastream<select value={draft.streamId} onChange={e=>setDraft({...draft,streamId:Number(e.target.value)})}>{streams.filter(s=>s.remoteId).map(s=><option key={s.id} value={s.id}>{devices.find(d=>d.id===s.deviceId)?.name||"Device"} · {s.name}</option>)}</select></label><label>Operator<select value={draft.operator} onChange={e=>setDraft({...draft,operator:e.target.value})}><option>&gt;</option><option>&lt;</option><option>=</option><option>!=</option></select></label><label>Threshold<input value={draft.threshold} onChange={e=>setDraft({...draft,threshold:e.target.value})}/></label></div><label>Action<select value={draft.action} onChange={e=>setDraft({...draft,action:e.target.value})}><option value="event">Create event</option><option value="device_command">Send digital_write</option></select></label><p className="modalHint">The first actuator action targets GPIO 2 / D2.</p><button className="primary full" onClick={create}>Save cloud automation</button></div></div>}
 <div className="panel"><div className="sectionHead"><div><h2>Active cloud rules</h2><span>{loading?"Refreshing…":items.length+" persistent automation(s)"}</span></div><span className="enabled">PostgreSQL</span></div>{items.length?<div className="ruleList">{items.map((item,index)=><div className="rule" key={String(item.id)}><div className="ruleNum">{String(index+1).padStart(2,"0")}</div><div className="ruleMain"><b>{item.name}</b><p>Device {item.deviceId} · Stream {item.streamId} {item.operator} {item.threshold} → {item.action}</p></div><span className={item.enabled?"enabled":"disabled"}>{item.enabled?"Enabled":"Paused"}</span><button className="mini" onClick={()=>toggle(item)}>{item.enabled?"Pause":"Enable"}</button><button className="trash" onClick={()=>remove(item)}><Trash2 size={15}/></button></div>)}</div>:<div className="emptyMini">No persistent automations configured.</div>}</div>
 <div className="panel"><div className="sectionHead"><div><h2>Execution history</h2><span>Rule and schedule executions are stored as durable runs.</span></div><span className="enabled">Durable</span></div>{runs.length?<div className="ruleList">{runs.map(run=><div className="rule" key={String(run.id)}><div className="ruleNum">{run.status==="dispatched"?"✓":run.status==="queued"?"Q":"!"}</div><div className="ruleMain"><b>{run.source_type==="schedule"?"Schedule":"Rule"} · {run.source_id}</b><p>Device {run.device_id} · {run.action}{run.command_id?" · "+run.command_id:""}{run.error?" · "+run.error:""}</p></div><span className={run.status==="failed"?"disabled":"enabled"}>{run.status}</span><span className="muted">{new Date(run.created_at).toLocaleString()}</span></div>)}</div>:<div className="emptyMini">No automation executions yet.</div>}</div>
 </div>
}

function SchedulesPanel({schedules,onToggle,onRun,onAdd,devices}:{schedules:Schedule[];onToggle:(id:number)=>void;onRun:(s:Schedule)=>void;onAdd:()=>void;devices:Device[]}){
 const [items,setItems]=useState<any[]>([]); const [open,setOpen]=useState(false); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
 const [draft,setDraft]=useState({name:"",deviceId:0,hour:"08",minute:"00",daysOfWeek:"1,2,3,4,5",timezone:"Asia/Kolkata",command:"sync",payload:"{}"});
 const load=async()=>{setLoading(true);try{const r=await fetch("/api/v1/schedules",{cache:"no-store"});const j=await r.json().catch(()=>null);if(r.ok)setItems(Array.isArray(j?.schedules)?j.schedules:[]);else setMessage(j?.error||"Schedule API unavailable")}catch{setMessage("Schedule API unavailable")}finally{setLoading(false)}};
 useEffect(()=>{if(!draft.deviceId&&devices[0])setDraft(d=>({...d,deviceId:devices[0].id}))},[devices,draft.deviceId]);
 useEffect(()=>{void load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[]);
 const create=async()=>{if(!draft.name.trim()||!draft.deviceId){setMessage("Choose a device and schedule name");return}try{const payload=JSON.parse(draft.payload||"{}");const days=draft.daysOfWeek.split(",").map(v=>Number(v.trim())).filter(v=>Number.isInteger(v)&&v>=0&&v<=6);const r=await fetch("/api/v1/schedules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:draft.name.trim(),deviceId:String(draft.deviceId),command:draft.command.trim()||"sync",payload,hour:Number(draft.hour),minute:Number(draft.minute),daysOfWeek:days,timezone:draft.timezone,enabled:true})});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||"Schedule creation failed");setOpen(false);setMessage("Schedule saved to PostgreSQL");await load()}catch(error){setMessage(error instanceof Error?error.message:"Schedule creation failed")}};
 const toggle=async(item:any)=>{try{const r=await fetch("/api/v1/schedules",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,enabled:!item.enabled})});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||"Schedule update failed");await load()}catch(error){setMessage(error instanceof Error?error.message:"Schedule update failed")}};
 const runNow=async(item:any)=>{try{const r=await fetch("/api/v1/schedules/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id})});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||"Schedule execution failed");setMessage(j?.result?.status==="queued"?item.name+" queued for device polling":item.name+" dispatched");await load()}catch(error){setMessage(error instanceof Error?error.message:"Schedule execution failed")}};
 const remove=async(item:any)=>{try{const r=await fetch("/api/v1/schedules?id="+encodeURIComponent(String(item.id)),{method:"DELETE"});const j=await r.json().catch(()=>null);if(!r.ok||j?.deleted===false)throw new Error(j?.error||"Schedule deletion failed");await load()}catch(error){setMessage(error instanceof Error?error.message:"Schedule deletion failed")}};
 const dayText=(days:number[])=>days?.length===7?"Every day":(days||[]).map(d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(" · ")||"Every day";
 return <div className="apiPage"><div className="sectionHead"><div><span className="eyebrow">CLOUD SCHEDULER · v0.56.0</span><h2>Persistent time-based device commands.</h2><span>Schedules are stored in PostgreSQL and evaluated by the secured automation worker.</span></div><button className="primary" onClick={()=>setOpen(v=>!v)}><Plus size={14}/>{open?"Close":"Add schedule"}</button></div>{message&&<div className="panel"><b>{message}</b></div>}
 {open&&<div className="panel"><div className="form"><label>Name<input autoFocus value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Morning device sync"/></label><label>Device<select value={draft.deviceId} onChange={e=>setDraft({...draft,deviceId:Number(e.target.value)})}><option value={0}>Select device</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><div className="conditionRow"><label>Hour<input type="number" min="0" max="23" value={draft.hour} onChange={e=>setDraft({...draft,hour:e.target.value})}/></label><label>Minute<input type="number" min="0" max="59" value={draft.minute} onChange={e=>setDraft({...draft,minute:e.target.value})}/></label><label>Days<select value={draft.daysOfWeek} onChange={e=>setDraft({...draft,daysOfWeek:e.target.value})}><option value="0,1,2,3,4,5,6">Every day</option><option value="1,2,3,4,5">Mon–Fri</option><option value="6,0">Weekend</option></select></label></div><label>Timezone<input value={draft.timezone} onChange={e=>setDraft({...draft,timezone:e.target.value})}/></label><label>Command<input value={draft.command} onChange={e=>setDraft({...draft,command:e.target.value})} placeholder="sync or digital_write"/></label><label>Payload JSON<input value={draft.payload} onChange={e=>setDraft({...draft,payload:e.target.value})} placeholder="{&quot;pin&quot;:2,&quot;value&quot;:1}"/></label><button className="primary full" onClick={create}>Save cloud schedule</button></div></div>}
 <div className="panel schedulePanel">{items.map(item=><div className="scheduleRow" key={String(item.id)}><div className="scheduleIcon"><Clock3 size={16}/></div><div className="scheduleMain"><b>{item.name}</b><p>{String(item.hour).padStart(2,"0")}:{String(item.minute).padStart(2,"0")} · {dayText(item.daysOfWeek)} · {item.command}</p></div><span className={item.enabled?"enabled":"disabled"}>{item.enabled?"Active":"Paused"}</span><button className="mini" onClick={()=>runNow(item)}><Play size={13}/> Run now</button><button className="mini" onClick={()=>toggle(item)}>{item.enabled?"Pause":"Enable"}</button><button className="trash" onClick={()=>remove(item)}><Trash2 size={15}/></button></div>)}{items.length===0&&<div className="emptyMini">{loading?"Loading persistent schedules…":"No cloud schedules configured."}</div>}</div>
 <div className="panel"><div className="apiTitle"><Bell size={17}/><div><b>Scheduler execution model</b><span>Each worker run checks enabled schedules, respects each configured timezone and day set, creates a persistent command, and records the result.</span></div></div></div></div>
}
function ActivityPanel({devices,rules}:{devices:Device[];rules:Rule[]}){return <div className="panel activity">{devices.slice().reverse().map((d,i)=><div className="activityRow" key={d.id}><div className="dot"/><div><b>{d.name}</b><p>{d.online?'Telemetry update received':'Device offline'}</p></div><span>{i+1}m ago</span></div>)}{rules.map(r=><div className="activityRow" key={'r'+r.id}><div className="dot subtle"/><div><b>{r.name}</b><p>Automation {r.enabled?'enabled':'paused'}</p></div><span>rule</span></div>)}</div>}

function ConnectivityPanel({devices,streams,apiKeys,setNotice}:{devices:Device[];streams:Stream[];apiKeys:ApiKey[];setNotice:(v:string)=>void}){
 const connectedDevices=devices.filter(d=>d.token);
 const [selectedId,setSelectedId]=useState<number>(connectedDevices[0]?.id||0);
 const [broker,setBroker]=useState('mqtts://YOUR_MQTT_BROKER:8883');
 const [clientId,setClientId]=useState('');
 const [status,setStatus]=useState<'Ready'|'Needs device'|'Needs token'>('Needs device');
 const selected=devices.find(d=>d.id===selectedId);
 useEffect(()=>{if(!devices.some(d=>d.id===selectedId))setSelectedId(devices[0]?.id||0)},[devices,selectedId]);
 useEffect(()=>{if(selected)setClientId(`sylvia-${selected.id}`)},[selected?.id]);
 useEffect(()=>{setStatus(selected?'Ready':'Needs device')},[selected?.id]);
 const token=selected?.token||'DEVICE_TOKEN_UNAVAILABLE';
 const baseUrl=typeof window!=='undefined'?window.location.origin:'';
 type VerifyState={status:'idle'|'running'|'pass'|'fail';message:string};
 const [verification,setVerification]=useState<Record<string,VerifyState>>({});
 const verifyStep=async(key:string,fn:()=>Promise<string>)=>{
   setVerification(v=>({...v,[key]:{status:'running',message:'Checking…'}}));
   try{const message=await fn();setVerification(v=>({...v,[key]:{status:'pass',message}}));return true;}
   catch(error){setVerification(v=>({...v,[key]:{status:'fail',message:error instanceof Error?error.message:'Verification failed'}}));return false;}
 };
 const runVerification=async()=>{
   if(!selected){setNotice('Select a registered device first');return;}
   setVerification({});
   if(!await verifyStep('cloud',async()=>{const r=await fetch('/api/v1/health',{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok||j?.restReady!==true)throw new Error(j?.error||'Cloud is not ready');return j?.realtimeReady===true ? `Database, schema, and MQTT readiness confirmed (session ${j?.checks?.mqtt?.connectionCount||0})` : 'Database and runtime schema ready for REST hardware; MQTT is optional';})) return setNotice('Verification stopped at cloud health');
   if(!await verifyStep('device',async()=>{const r=await fetch('/api/v1/devices/'+selected.id,{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||'Device lookup failed');return 'Owned device is reachable through the cloud API';})) return setNotice('Verification stopped at device identity');
   if(!await verifyStep('streams',async()=>{const r=await fetch('/api/v1/datastreams?deviceId='+encodeURIComponent(String(selected.id)),{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||'Datastream lookup failed');const count=Array.isArray(j?.datastreams)?j.datastreams.length:0;if(!count)throw new Error('No persistent datastream configured');return count+' persistent datastream'+(count===1?'':'s')+' available';})) return setNotice('Verification stopped at datastream readiness');
   if(!await verifyStep('telemetry',async()=>{const stream=streams.find(s=>s.deviceId===selected.id&&s.remoteId);if(!stream)throw new Error('No datastream ID available for telemetry verification');const r=await fetch('/api/v1/telemetry?deviceId='+selected.id+'&streamId='+encodeURIComponent(String(stream.remoteId)),{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||'Telemetry lookup failed');const samples=Array.isArray(j?.samples)?j.samples:[];const latest=samples.map((s:{timestamp?:string})=>Date.parse(String(s.timestamp||''))).filter(Number.isFinite).sort((a:number,b:number)=>b-a)[0];if(!samples.length)throw new Error('No telemetry sample received yet — keep the device connected until the first sample is persisted');if(latest&&Date.now()-latest>120000)return 'Persisted samples exist, but the latest sample is older than 2 minutes';return samples.length+' persisted samples found; latest sample is fresh';})) return setNotice('Verification stopped at telemetry');
   if(!await verifyStep('heartbeat',async()=>{const r=await fetch('/api/v1/devices/'+selected.id,{cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||'Device state unavailable');if(!j?.device?.online)throw new Error('Device is offline — connect the ESP8266 and wait for heartbeat');const lastSeen=Date.parse(String(j?.device?.lastSeen||''));if(lastSeen&&Date.now()-lastSeen>45000)throw new Error('Device is marked online but heartbeat is older than 45 seconds');return 'Device is online and heartbeat is fresh';})) return setNotice('Verification stopped at hardware heartbeat');
   if(!await verifyStep('command',async()=>{const r=await fetch('/api/v1/devices/'+selected.id+'/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'identify',payload:null})});const j=await r.json().catch(()=>null);if(!r.ok||j?.ok!==true)throw new Error(j?.error||'Command queue rejected the request');const commandId=String(j.commandId||'');if(!commandId)throw new Error('Command was accepted without a persistent command ID');const deadline=Date.now()+12000;while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1500));const historyResponse=await fetch('/api/v1/devices/'+selected.id+'/commands?history=true&limit=10',{cache:'no-store'});const historyData=await historyResponse.json().catch(()=>null);const command=Array.isArray(historyData?.commands)?historyData.commands.find((item:{id?:string})=>String(item.id)===commandId):null;if(command?.status==='acked')return 'Identify command acknowledged by the device';if(command?.status==='failed')throw new Error('Identify command was acknowledged as failed');}throw new Error('Command entered the persistent queue; device acknowledgement not received within 12 seconds');})) return setNotice('Verification stopped at command acknowledgement');
   setNotice('Hardware verification passed');
 };
 const copy=async(text:string)=>{try{await navigator.clipboard?.writeText(text);setNotice('Copied to clipboard')}catch{setNotice('Copy unavailable')}};
 const firmware=`/* SYLVIA v0.53.8 — official Arduino SDK starter */
// Install the ESP8266 board package, ArduinoJson, and the Sylvia library.
#include <ESP8266WiFi.h>
#include <Sylvia.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* SYLVIA_BASE_URL = "${baseUrl||"https://YOUR_SYLVIA_DOMAIN"}";
const char* SYLVIA_DEVICE_ID = "${selected?.id||"YOUR_DEVICE_ID"}";
const char* SYLVIA_DEVICE_TOKEN = "${token}";
const char* SYLVIA_TELEMETRY_STREAM = "${streams.find(s=>s.deviceId===selected?.id&&s.remoteId)?.remoteId||"YOUR_DATASTREAM_ID"}";

static const char SYLVIA_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_SERVER_ROOT_CA_HERE
-----END CERTIFICATE-----
)EOF";

const uint8_t RELAY_PIN = D2;
const uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
Sylvia sylvia;

bool handleIdentify(JsonObjectConst payload) {
  (void)payload;
  Serial.println("SYLVIA: identify received");
  digitalWrite(LED_BUILTIN, LOW);
  delay(250);
  digitalWrite(LED_BUILTIN, HIGH);
  return true;
}

bool handleSync(JsonObjectConst payload) {
  (void)payload;
  sylvia.reportState("relayPin", RELAY_PIN);
  sylvia.reportState("relayOn", digitalRead(RELAY_PIN) == HIGH);
  Serial.println("SYLVIA: sync completed");
  return true;
}

bool handleDigitalWrite(JsonObjectConst payload) {
  const int pin = payload["pin"] | RELAY_PIN;
  const int value = payload["value"] | -1;
  if (pin != RELAY_PIN || value < 0 || value > 1) {
    Serial.println("SYLVIA: rejected digital_write payload");
    return false;
  }
  pinMode(pin, OUTPUT);
  digitalWrite(pin, value ? HIGH : LOW);
  sylvia.reportState("relayPin", pin);
  sylvia.reportState("relayOn", value == 1);
  Serial.printf("SYLVIA: GPIO %d = %d\n", pin, value);
  return true;
}

bool tlsConfigured() {
  const String ca = String(SYLVIA_ROOT_CA);
  return ca.indexOf("PASTE_SERVER_ROOT_CA_HERE") < 0 &&
         ca.indexOf("-----BEGIN CERTIFICATE-----") >= 0 &&
         ca.indexOf("-----END CERTIFICATE-----") >= 0;
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting Wi-Fi");
  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("SYLVIA: Wi-Fi connection timeout");
    return false;
  }
  Serial.print("IP: "); Serial.println(WiFi.localIP());
  Serial.print("RSSI: "); Serial.println(WiFi.RSSI());
  return true;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  if (!connectWiFi()) return;
  if (!tlsConfigured()) { Serial.println("SYLVIA: replace PASTE_SERVER_ROOT_CA_HERE with the production Root CA"); return; }
  if (!sylvia.begin(SYLVIA_DEVICE_ID, SYLVIA_DEVICE_TOKEN, SYLVIA_BASE_URL, SYLVIA_ROOT_CA)) {
    Serial.print("SYLVIA: startup failed: ");
    Serial.println(sylvia.lastError());
    return;
  }
  sylvia.setHeartbeatInterval(15000);
  sylvia.setCommandPollInterval(2000);
  sylvia.setHttpTimeout(10000);
  sylvia.onCommand("identify", handleIdentify);
  sylvia.onCommand("sync", handleSync);
  sylvia.onCommand("digital_write", handleDigitalWrite);
  sylvia.reportState("relayPin", RELAY_PIN);
  sylvia.reportState("relayOn", false);
  Serial.print("SYLVIA SDK ");
  Serial.print(Sylvia::sdkVersion());
  Serial.println(" initialized");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); return; }
  sylvia.loop();
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 30000 || lastTelemetry == 0) {
    lastTelemetry = millis();
    const double uptimeSeconds = millis() / 1000.0;
    const bool ok = sylvia.telemetry(SYLVIA_TELEMETRY_STREAM, uptimeSeconds);
    if (ok) Serial.println("SYLVIA: telemetry sent");
    else { Serial.print("SYLVIA: telemetry failed: "); Serial.println(sylvia.lastError()); }
  }
}`;
 return <div className="apiPage"><div className="hero"><div><span className="eyebrow">DEVICE CONNECTIVITY</span><h1>Connect real hardware from this console.</h1><p>Register a device, use its device token, then connect ESP8266/NodeMCU over authenticated HTTPS. MQTT/TLS is available as an optional realtime transport path.</p></div><div className="heroActions"><span className={status==='Ready'?'enabled':'disabled'}>{status}</span></div></div><div className="stats"><Stat label="Registered devices" value={devices.length}/><Stat label="Connected" value={devices.filter(d=>d.online).length}/><Stat label="Transport" value="REST + MQTT"/><Stat label="SDK" value="ESP8266 v0.53.8"/></div><div className="panel"><div className="apiTitle"><Cpu size={17}/><div><b>Hardware connection flow</b><span>Use the REST/HTTPS starter for the first hardware test, or use MQTT/TLS for realtime transport.</span></div></div><div className="connectionSteps"><div><span>01</span><b>Register</b><small>Create the device in the main console and keep the one-time device token.</small></div><div><span>02</span><b>Configure</b><small>Set Wi-Fi, SYLVIA production URL and the device token.</small></div><div><span>03</span><b>Connect</b><small>ESP8266 connects over authenticated HTTPS with server certificate validation.</small></div><div><span>04</span><b>Publish</b><small>Send telemetry and heartbeat messages from the firmware.</small></div></div></div><div className="apiGrid"><div className="panel"><div className="apiTitle"><Network size={17}/><div><b>Registered device</b><span>Select a registered device and use its one-time token for the HTTPS hardware starter.</span></div></div><div className="form"><label>Device<select value={selectedId} onChange={e=>setSelectedId(Number(e.target.value))}>{devices.length?devices.map(d=><option key={d.id} value={d.id}>{d.name} · {d.online?'Online':'Offline'}</option>):<option value={0}>No registered devices</option>}</select></label><label>SYLVIA URL<input value={baseUrl} readOnly /></label><label>MQTT client ID<input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder={selected?`sylvia-${selected.id}`:'sylvia-device'}/></label><div className="provisionBox"><div><b>Device token</b><span className="mono">{selected?.token||'Register a device to receive its token. Tokens are not recoverable after leaving the registration session.'}</span></div>{selected?.token&&<button className="secondary" onClick={()=>copy(selected.token)}><Copy size={13}/> Copy token</button>}</div></div></div><div className="panel"><div className="apiTitle"><Terminal size={17}/><div><b>ESP8266 / NodeMCU REST starter</b><span>Authenticated HTTPS polling for the persistent SYLVIA command queue.</span></div></div><pre>{firmware}</pre><button className="secondary" onClick={()=>copy(firmware)}><Copy size={14}/> Copy firmware</button></div></div><div className="panel"><div className="sectionHead"><div><h2>MQTT contract</h2><span>All device IDs use the same topic family.</span></div></div><div className="endpointList"><div className="endpoint"><span className="endpointDot"/><div><b>Telemetry</b><small>sylvia/devices/{'{deviceId}'}/telemetry</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Heartbeat</b><small>sylvia/devices/{'{deviceId}'}/heartbeat</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Commands</b><small>sylvia/devices/{'{deviceId}'}/command</small></div></div><div className="endpoint"><span className="endpointDot"/><div><b>Command ACK</b><small>sylvia/devices/{'{deviceId}'}/command-ack</small></div></div></div></div><div className="panel"><div className="sectionHead"><div><div className="apiTitle"><ShieldCheck size={17}/><div><h2>Hardware verification</h2><span>Run the hosted cloud checks before connecting or debugging physical hardware.</span></div></div></div><button className="primary" onClick={runVerification} disabled={!selected}><Play size={14}/> Run verification</button></div><div className="connectionSteps verificationSteps"><div key="cloud"><span>{verification['cloud']?.status==='pass'?'✓':verification['cloud']?.status==='fail'?'!':'01'}</span><b>Cloud</b><small>{verification['cloud']?.message||'Not checked yet'} · Health endpoint reports REST readiness; MQTT is shown separately.</small></div><div key="device"><span>{verification['device']?.status==='pass'?'✓':verification['device']?.status==='fail'?'!':'02'}</span><b>Device</b><small>{verification['device']?.message||'Not checked yet'} · Session can read the selected owned device.</small></div><div key="streams"><span>{verification['streams']?.status==='pass'?'✓':verification['streams']?.status==='fail'?'!':'03'}</span><b>Datastreams</b><small>{verification['streams']?.message||'Not checked yet'} · Persistent datastream registry is available.</small></div><div key="telemetry"><span>{verification['telemetry']?.status==='pass'?'✓':verification['telemetry']?.status==='fail'?'!':'04'}</span><b>Telemetry</b><small>{verification['telemetry']?.message||'Not checked yet'} · Cloud telemetry endpoint can read samples.</small></div><div key="heartbeat"><span>{verification['heartbeat']?.status==='pass'?'✓':verification['heartbeat']?.status==='fail'?'!':'05'}</span><b>Heartbeat</b><small>{verification['heartbeat']?.message||'Not checked yet'} · Physical device must report online state.</small></div><div key="command"><span>{verification['command']?.status==='pass'?'✓':verification['command']?.status==='fail'?'!':'06'}</span><b>Command</b><small>{verification['command']?.message||'Not checked yet'} · Identify command can enter the device command path.</small></div></div></div><div className="panel"><div className="apiTitle"><ShieldCheck size={17}/><div><b>Security requirement</b><span>For hosted hardware, use MQTT/TLS with certificate validation. Never publish device tokens in source code repositories.</span></div></div></div></div>}

function TelemetryPanel({devices,streams,history,setHistory,setNotice}:{devices:Device[];streams:Stream[];history:Record<number,HistoryPoint[]>;setHistory:React.Dispatch<React.SetStateAction<Record<number,HistoryPoint[]>>>;setNotice:(v:string)=>void}){
 const numeric=streams.filter(s=>s.type==='Number');
 const [deviceId,setDeviceId]=useState<number>(devices[0]?.id||0);
 const deviceStreams=numeric.filter(s=>s.deviceId===deviceId);
 const [streamId,setStreamId]=useState<number>(deviceStreams[0]?.id||numeric[0]?.id||0);
 const [cloudLoading,setCloudLoading]=useState(false);
 const [storage,setStorage]=useState('local');
 useEffect(()=>{if(!deviceStreams.some(s=>s.id===streamId))setStreamId(deviceStreams[0]?.id||numeric[0]?.id||0)},[deviceId,numeric.length,deviceStreams,streamId]);
 const stream=numeric.find(s=>s.id===streamId);
 const remoteStreamId=stream?.remoteId;
 useEffect(()=>{
   if(!deviceId||!streamId)return;
   let active=true;
   const loadCloudTelemetry=async()=>{
     setCloudLoading(true);
     try{
       const r=await fetch(`/api/v1/telemetry?deviceId=${deviceId}&streamId=${encodeURIComponent(String(stream?.remoteId||streamId))}`,{cache:'no-store'});
       const j=await r.json().catch(()=>null);
       if(!active||!r.ok||!Array.isArray(j?.samples))return;
       const cloudPoints=j.samples
         .filter((sample:{value?:unknown})=>typeof sample.value==='number'&&Number.isFinite(sample.value))
         .map((sample:{value:number;timestamp:string})=>({ts:Date.parse(sample.timestamp),value:Number(sample.value)}))
         .filter((point:HistoryPoint)=>Number.isFinite(point.ts))
         .sort((a:HistoryPoint,b:HistoryPoint)=>a.ts-b.ts)
         .slice(-60);
       if(cloudPoints.length)setHistory(h=>({...h,[streamId]:cloudPoints}));
       if(j.storage)setStorage(String(j.storage));
     }catch{}finally{if(active)setCloudLoading(false)}
   };
   void loadCloudTelemetry();
   const timer=setInterval(loadCloudTelemetry,5000);
   return()=>{active=false;clearInterval(timer)};
 },[deviceId,streamId,remoteStreamId,numeric.length,setHistory]);
 const points=stream?history[stream.id]||[]:[];
 const values=points.map(p=>p.value);
 const min=values.length?Math.min(...values):Number(stream?.value)||0;
 const max=values.length?Math.max(...values):Number(stream?.value)||0;
 const avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:Number(stream?.value)||0;
 const span=Math.max(1,max-min);
 const line=points.map((p,i)=>`${(i/Math.max(1,points.length-1))*100},${94-((p.value-min)/span)*78}`).join(' ');
 const exportCsv=()=>{if(!stream)return;const rows=['timestamp,value',...points.map(p=>`${new Date(p.ts).toISOString()},${p.value}`)].join('\\n');const blob=new Blob([rows],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sylvia-${stream.name.toLowerCase().replace(/\\s+/g,'-')}-telemetry.csv`;a.click();URL.revokeObjectURL(a.href);setNotice('Telemetry CSV exported')};
 const clear=()=>{if(stream){setHistory(h=>({...h,[stream.id]:[]}));setNotice('Telemetry history cleared')}};
 return <div className="telemetryPage"><div className="hero"><div><span className="eyebrow">TELEMETRY CENTER</span><h1>See what your devices have been doing.</h1><p>Inspect persistent cloud telemetry, watch the live trend and export the data for analysis.</p></div><div className="heroActions"><span className="telemetryLive"><i/>{cloudLoading?' Syncing cloud…':` Cloud: ${storage}`}</span><button className="secondary" onClick={clear}><Trash2 size={14}/> Clear local view</button><button className="primary" onClick={exportCsv}><ExternalLink size={14}/> Export CSV</button></div></div><div className="telemetryToolbar"><label>Device<select className="premiumField" value={deviceId} onChange={e=>setDeviceId(Number(e.target.value))}>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Datastream<select className="premiumField" value={streamId} onChange={e=>setStreamId(Number(e.target.value))}>{deviceStreams.length?deviceStreams.map(s=><option key={s.id} value={s.id}>{s.name}</option>):<option value={0}>No numeric streams</option>}</select></label></div>{stream?<><div className="stats"><Stat label="Current" value={`${stream.value}${stream.unit}`}/><Stat label="Minimum" value={`${min.toFixed(1)}${stream.unit}`}/><Stat label="Average" value={`${avg.toFixed(1)}${stream.unit}`}/><Stat label="Samples" value={points.length}/></div><div className="panel telemetryChart"><div className="sectionHead"><div><h2>{stream.name} history</h2><span>{points.length} recent persisted samples</span></div><span className="telemetryLive"><i/>Live cloud sync</span></div><div className="chartFrame">{points.length>1?<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg>:<div className="chartEmpty">Waiting for persisted telemetry from the device…</div>}</div></div><div className="panel"><div className="sectionHead"><div><h2>Recent samples</h2><span>Loaded directly from the SYLVIA telemetry API.</span></div></div><div className="sampleGrid">{points.slice(-10).reverse().map(p=><div className="sample" key={p.ts}><b>{p.value}{stream.unit}</b><span>{new Date(p.ts).toLocaleTimeString()}</span></div>)}</div></div></>:<div className="dashboardEmpty"><b>No numeric datastream available</b><span>Create a numeric datastream for this device to start collecting telemetry.</span></div>}</div>}

function ApiPanel({devices,streams,apiKeys,webhooks,result,setResult,loading,setLoading,writeValue,setWriteValue,onCreateKey}:{devices:Device[];streams:Stream[];apiKeys:ApiKey[];webhooks:Webhook[];result:string;setResult:(v:string)=>void;loading:boolean;setLoading:(v:boolean)=>void;writeValue:string;setWriteValue:(v:string)=>void;onCreateKey:()=>void}){const token=apiKeys.find(k=>k.token&&!k.revoked)?.token||'';const run=async(path:string,init?:RequestInit)=>{setLoading(true);try{const baseHeaders=token?{Authorization:`Bearer ${token}`}:{ };const r=await fetch(path,{...init,headers:{...baseHeaders,'Content-Type':'application/json',...(init?.headers||{})}});setResult(JSON.stringify(await r.json(),null,2))}catch{setResult(JSON.stringify({error:'API unavailable'},null,2))}finally{setLoading(false)}};return <div className="apiPage"><div className="sectionHead"><div><h2>Developer API</h2><span>Use the same API surface your future hardware integrations will call.</span></div><button className="primary" onClick={onCreateKey}><KeyRound size={14}/> Create key</button></div><div className="apiGrid"><ApiBox title="Health" endpoint="GET /api/v1/health" icon={<Shield/>} action={()=>run('/api/v1/health')} loading={loading}/><ApiBox title="Device state" endpoint={`/api/v1/devices/${devices[0]?.id||1}`} icon={<Cpu size={16}/>} action={()=>run(`/api/v1/devices/${devices[0]?.id||1}`)} loading={loading}/><div className="panel"><div className="apiTitle"><Hash size={17}/><div><b>Write datastream</b><span>POST /api/v1/datastreams/:id/value</span></div></div><div className="buttonRow"><input className="compactInput" value={writeValue} onChange={e=>setWriteValue(e.target.value)}/><button className="primary" onClick={()=>run(`/api/v1/datastreams/${streams[0]?.id||1}/value`,{method:'POST',body:JSON.stringify({value:Number(writeValue)})})}>{loading?'Writing…':'Write value'}</button></div></div></div><div className="panel"><div className="sectionHead"><div><h2>API response</h2><span>Live response from the Next.js server routes.</span></div><button className="secondary" onClick={()=>setResult('')}>Clear</button></div><pre className="resultBox">{result||'Run an API request to see the response.'}</pre></div><div className="panel"><div className="apiTitle"><Plug size={17}/><div><b>Device integration contract</b><span>Copy this pattern into firmware, scripts or gateways.</span></div></div><pre>{`Authorization: Bearer ${token||'YOUR_DEVICE_TOKEN'}\nPOST /api/v1/devices/${devices[0]?.id||1}/heartbeat\nPOST /api/v1/datastreams/${streams[0]?.id||1}/value\n{ "value": 25 }`}</pre></div><div className="panel"><div className="sectionHead"><div><h2>Webhooks</h2><span>{webhooks.filter(w=>w.enabled).length} active event endpoint(s).</span></div></div>{webhooks.map(w=><div className="endpoint" key={w.id}><span className="endpointDot"/><div><b>{w.name}</b><small>{w.event} · {w.url}</small></div></div>)}</div></div>}
function ApiBox({title,endpoint,icon,action,loading}:{title:string;endpoint:string;icon:React.ReactNode;action:()=>void;loading:boolean}){return <div className="panel"><div className="apiTitle">{icon}<div><b>{title}</b><span>{endpoint}</span></div></div><button className="primary" onClick={action}>{loading?'Calling…':'Call API'}</button></div>}
function Shield(){return <ExternalLink size={16}/>}
function ZyraPanel({config,setConfig,setNotice}:{config:ZyraConfig;setConfig:(v:ZyraConfig)=>void;setNotice:(v:string)=>void;devices?:Device[];streams?:Stream[];apiKeys?:ApiKey[]}){
 const capabilities=['device.read','telemetry.read','telemetry.write','device.command','event.subscribe','automation.trigger'];
 const connect=()=>{setConfig({...config,enabled:true,label:config.label||'ZYRA AI Agent',project:config.project||'ZYRA AI Ecosystem'});setNotice('ZYRA AI connection option enabled')};
 const disconnect=()=>{setConfig({...config,enabled:false});setNotice('ZYRA AI connection disabled')};
 return <div className="apiPage"><div className="hero"><div><span className="eyebrow">OPTIONAL INTEGRATION</span><h1>Connect SYLVIA to ZYRA AI when you are ready.</h1><p>SYLVIA remains fully independent. This connection point is reserved for future ZYRA AI integration.</p></div><div className="heroActions"><span className={config.enabled?'enabled':'disabled'}>{config.enabled?'Ready to connect':'Not connected'}</span>{config.enabled?<button className="secondary" onClick={disconnect}>Disconnect</button>:<button className="primary" onClick={connect}>Connect to ZYRA AI</button>}</div></div><div className="stats"><Stat label="Status" value={config.enabled?'Ready':'Independent'}/><Stat label="Devices" value="Available"/><Stat label="Telemetry" value="Available"/><Stat label="Future API" value="Reserved"/></div><div className="panel"><div className="sectionHead"><div><h2>ZYRA AI connection</h2><span>No ZYRA service is required to run SYLVIA.</span></div></div><div className="settingsGrid"><label>Connection label<input value={config.label} onChange={e=>setConfig({...config,label:e.target.value})} placeholder="ZYRA AI Agent"/></label><label>Project name<input value={config.project} onChange={e=>setConfig({...config,project:e.target.value})} placeholder="ZYRA AI Ecosystem"/></label><label>Future integration mode<select value={config.mode} onChange={e=>setConfig({...config,mode:e.target.value as ZyraConfig['mode']})}><option>Bridge</option><option>Webhook</option></select></label><label>Future endpoint<input value={config.endpoint} onChange={e=>setConfig({...config,endpoint:e.target.value})} placeholder="Add later when ZYRA integration is ready"/></label></div></div><div className="apiGrid"><div className="panel"><div className="apiTitle"><Bot size={17}/><div><b>Reserved capabilities</b><span>Prepared for future ZYRA orchestration</span></div></div><div className="endpointList">{capabilities.map(c=><div className="endpoint" key={c}><span className="endpointDot"/><div><b>{c}</b><small>Reserved integration capability</small></div></div>)}</div></div><div className="panel"><div className="apiTitle"><Plug size={17}/><div><b>Architecture</b><span>Loose coupling by design</span></div></div><pre>{`SYLVIA
  ├─ Devices
  ├─ Datastreams
  ├─ Dashboards
  ├─ Automations
  └─ Developer API
       │
       └── Optional future connection
               │
             ZYRA AI`}</pre></div></div></div>}

function SettingsPanel({projectName,setProjectName,apiKeys,onCreateKey,onDeleteKey,webhooks,onAddWebhook,onToggleWebhook,onDeleteWebhook,reset,zyraConfig,setZyraConfig}:{projectName:string;setProjectName:(v:string)=>void;apiKeys:ApiKey[];onCreateKey:()=>void;onDeleteKey:(id:number)=>void;webhooks:Webhook[];onAddWebhook:()=>void;onToggleWebhook:(id:number)=>void;onDeleteWebhook:(id:number)=>void;reset:()=>void;zyraConfig:ZyraConfig;setZyraConfig:(v:ZyraConfig)=>void}){return <div className="settingsPanel"><div className="panel settingsPanel"><label>Project name<input className="premiumField" value={projectName} onChange={e=>setProjectName(e.target.value)}/></label><label>Environment<select className="premiumField" defaultValue="Simulator"><option>Simulator</option><option>Development</option><option>Production</option></select></label></div><div className="panel"><div className="sectionHead"><div><h2>API keys</h2><span>Use project keys for server-side integrations.</span></div><button className="primary" onClick={onCreateKey}><KeyRound size={14}/> Create key</button></div><div className="keyList">{apiKeys.map(k=><div className="keyRow" key={k.id}><div><b>{k.name}</b><small>{k.token}</small></div><button className="trash" onClick={()=>onDeleteKey(k.id)}><Trash2 size={15}/></button></div>)}</div></div><div className="panel"><div className="sectionHead"><div><h2>Webhooks</h2><span>Receive device, automation and event notifications.</span></div><button className="primary" onClick={onAddWebhook}><Plus size={14}/> Add webhook</button></div><div className="keyList">{webhooks.map(w=><div className="keyRow" key={w.id}><div><b>{w.name}</b><small>{w.event} · {w.url}</small></div><button className="mini" onClick={()=>onToggleWebhook(w.id)}>{w.enabled?'Enabled':'Paused'}</button><button className="trash" onClick={()=>onDeleteWebhook(w.id)}><Trash2 size={15}/></button></div>)}</div></div><div className="panel"><div className="integrationCard"><div className="integrationIcon"><Plug size={17}/></div><div><b>ZYRA AI connection</b><span>Optional future integration. SYLVIA works independently and can be connected to ZYRA AI later.</span></div><button className={zyraConfig.enabled?'mini':'primary'} onClick={()=>setZyraConfig({...zyraConfig,enabled:!zyraConfig.enabled})}>{zyraConfig.enabled?'Connected':'Connect to ZYRA AI'}</button></div><div className="integrationCard"><div className="integrationIcon"><Boxes size={17}/></div><div><b>SYLVIA core</b><span>Templates · Devices · Datastreams · Dashboards · Automations · REST · Webhooks · MQTT-ready</span></div></div><button className="secondary full" onClick={reset}><RotateCw/> Clear workspace data</button></div></div>}