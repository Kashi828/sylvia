const base=(process.env.SYLVIA_PUBLIC_BASE_URL||'').replace(/\/$/,'');
if(!base){console.error('Set SYLVIA_PUBLIC_BASE_URL');process.exit(1)}
const paths=['/api/v1/health','/api/v1/fleet','/api/v1/notifications'];
let failed=0;
for(const path of paths){try{const r=await fetch(base+path,{redirect:'manual'});console.log(`${r.ok?'PASS':'WARN'} ${r.status} ${path}`);if(!r.ok && path.includes('health')) failed++}catch(e){console.error(`FAIL ${path}: ${e.message}`);failed++}}
if(failed) process.exit(1); console.log('SYLVIA v0.50 hosted smoke test complete.');
