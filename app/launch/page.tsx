'use client';

import { useState } from 'react';
import { ArrowRight, Cpu, Gauge, LockKeyhole, Menu, Radio, X, Zap } from 'lucide-react';

const features = [
  { icon: Cpu, title: 'Connect devices', text: 'Bring ESP8266, ESP32 and other IoT hardware into one cloud workspace.' },
  { icon: Gauge, title: 'See live telemetry', text: 'Stream sensor data into dashboards with realtime device visibility.' },
  { icon: Zap, title: 'Automate actions', text: 'Build rules, schedules, alerts and device commands without glue code.' },
  { icon: LockKeyhole, title: 'Designed for control', text: 'Device-scoped tokens, TLS-ready MQTT and cloud-side security controls.' },
];

export default function LaunchPage() {
  const [open, setOpen] = useState(false);
  const consoleHref = '/console';
  return (
    <main className="launchPage">
      <nav className="launchNav">
        <a className="brand" href="/"><span className="brandMark">S</span> SYLVIA</a>
        <div className={open ? 'navLinks open' : 'navLinks'}>
          <a href="#platform" onClick={() => setOpen(false)}>Platform</a>
          <a href="#developers" onClick={() => setOpen(false)}>Developers</a>
          <a href="#hardware" onClick={() => setOpen(false)}>Hardware</a>
          <a href="/beta" onClick={() => setOpen(false)}>Hardware Beta</a>
          <a className="navCta" href={consoleHref} onClick={() => setOpen(false)}>Open Console <ArrowRight size={15}/></a>
        </div>
        <button className="menuButton" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button>
      </nav>

      <section className="launchHero" id="platform">
        <div className="heroGlow" />
        <div className="heroCopy">
          <div className="launchEyebrow"><span className="pulse"/> OPEN IOT PLATFORM · HOSTED BETA</div>
          <h1>Build the connected world.<br/><em>Without the complexity.</em></h1>
          <p>SYLVIA gives developers one clean platform to connect devices, stream telemetry, build dashboards and automate real-world systems.</p>
          <div className="heroActions">
            <a className="launchPrimary" href={consoleHref}>Start building <ArrowRight size={17}/></a>
            <a className="launchSecondary" href="#developers">Explore the platform</a>
          </div>
          <div className="heroMeta"><span><Radio size={14}/> MQTT / REST</span><span><Cpu size={14}/> ESP8266 / ESP32</span><span><LockKeyhole size={14}/> TLS-ready</span></div>
        </div>
        <div className="heroVisual" aria-label="SYLVIA platform preview">
          <div className="visualTop"><span>SYLVIA / Overview</span><span className="live"><i/> LIVE</span></div>
          <div className="visualStats"><div><small>DEVICES</small><b>24</b><span>+4 this week</span></div><div><small>ONLINE</small><b>21</b><span>87.5% connected</span></div><div><small>EVENTS</small><b>1,284</b><span>last 24 hours</span></div></div>
          <div className="chartCard"><div className="chartHead"><span>Temperature · Living Room</span><b>24.8°C</b></div><svg viewBox="0 0 500 150" preserveAspectRatio="none"><path d="M0 118 C35 105 42 120 72 92 S120 105 150 76 S190 95 220 62 S260 70 292 48 S330 80 362 57 S405 68 438 34 S470 50 500 25" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M0 118 C35 105 42 120 72 92 S120 105 150 76 S190 95 220 62 S260 70 292 48 S330 80 362 57 S405 68 438 34 S470 50 500 25 L500 150 L0 150Z" fill="currentColor" opacity=".08"/></svg><div className="chartAxis"><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span></div></div>
          <div className="deviceRow"><span className="deviceDot"/><div><b>Living Room Sensor</b><small>ESP8266 · MQTT</small></div><strong>Online</strong></div>
        </div>
      </section>

      <section className="launchSection" id="developers"><div className="sectionIntro"><span>ONE PLATFORM</span><h2>From first prototype<br/>to real hardware.</h2><p>Everything you need to move from an idea on your desk to connected devices in the field.</p></div><div className="featureGrid">{features.map(({icon:Icon,title,text})=><article className="featureCard" key={title}><Icon size={20}/><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="launchBand" id="hardware"><div><span className="launchEyebrow">DEVELOPER FIRST</span><h2>Your hardware. Your data. Your cloud.</h2><p>Use a simple device SDK, MQTT or REST APIs. Keep your architecture open and your hardware independent.</p></div><div className="codeCard"><div><span>// ESP8266 / ESP32</span><b>Sylvia.virtualWrite(0, temperature);</b><b>Sylvia.run();</b></div></div></section>

      <section className="launchFinal"><span className="launchEyebrow">SYLVIA</span><h2>Make your next device<br/><em>feel like software.</em></h2><a className="launchPrimary" href={consoleHref}>Open SYLVIA Console <ArrowRight size={17}/></a></section>
      <footer><span>© 2026 SYLVIA</span><span>Open IoT platform · Hosted beta</span></footer>
    </main>
  );
}
