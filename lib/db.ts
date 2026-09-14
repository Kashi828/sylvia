import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;
export function databaseConfigured(){ return Boolean(process.env.DATABASE_URL); }
export function getPool(){
  if(!process.env.DATABASE_URL) return null;
  if(!pool) pool=new Pool({connectionString:process.env.DATABASE_URL, max:5, idleTimeoutMillis:10000});
  return pool;
}
export async function query<T extends QueryResultRow=QueryResultRow>(text:string, params:any[]=[]){
  const p=getPool(); if(!p) throw new Error('DATABASE_URL is not configured');
  return p.query<T>(text,params);
}
