// Applies a .sql migration file against POSTGRES_URL. Used to ship schema fixes
// that cannot run inside a serverless request.
//
//   node scripts/migrate.mjs supabase/migrations/<file>.sql
//
// Each statement runs in its own transaction so a failure names the exact statement.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

for (const file of ['.env.production-secrets.local', '.env.production.local', '.env.local']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/migrate.mjs <file.sql>');
  process.exit(1);
}
const sql = fs.readFileSync(path.resolve(process.cwd(), target), 'utf8');
const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('POSTGRES_URL is not set');
  process.exit(1);
}

// Strip comment-only lines, then split on top-level semicolons, respecting $$ blocks.
const statements = [];
let buf = '';
let inDollar = false;
for (const rawLine of sql.split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('--')) {
    if (!buf.trim() && !inDollar) continue;
  }
  if (/\$\$/.test(line)) inDollar = !inDollar;
  buf += rawLine + '\n';
  if (!inDollar && line.endsWith(';')) {
    const stmt = buf.trim();
    if (stmt.replace(/--[^\n]*/g, '').trim()) statements.push(stmt);
    buf = '';
  }
}
if (buf.trim()) statements.push(buf.trim());

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log(`Applying ${target} (${statements.length} statements)`);

let applied = 0;
for (const [i, stmt] of statements.entries()) {
  const label = stmt.replace(/\s+/g, ' ').slice(0, 78);
  try {
    await client.query(stmt);
    applied++;
    console.log(`  ok   ${i + 1}/${statements.length}  ${label}`);
  } catch (error) {
    console.error(`  FAIL ${i + 1}/${statements.length}  ${label}`);
    console.error(`       ${error.message}`);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log(`Applied ${applied}/${statements.length} statements.`);