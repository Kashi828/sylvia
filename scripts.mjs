import fs from 'node:fs/promises';
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL){console.error('DATABASE_URL is required');process.exit(1)}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
await pool.query(`create table if not exists schema_migrations(version text primary key, applied_at timestamptz not null default now())`);
const files=(await fs.readdir('./db/migrations')).filter(x=>x.endsWith('.sql')).sort();
for(const file of files){const exists=await pool.query('select 1 from schema_migrations where version=$1',[file]); if(exists.rowCount) continue; const sql=await fs.readFile('./db/migrations/'+file,'utf8'); const c=await pool.connect(); try{await c.query('begin'); await c.query(sql); await c.query('insert into schema_migrations(version) values($1)',[file]); await c.query('commit'); console.log('Applied',file);} catch(e){await c.query('rollback');throw e} finally{c.release()}}
await pool.end();
