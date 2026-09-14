import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;

/** Resolve the runtime Postgres URL without exposing its value. */
export function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return value ? value.trim() : null;
}

export function databaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getPool(): Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL is not configured');
  return p.query<T>(text, params);
}
