import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;

/**
 * SYLVIA now uses the Postgres database provisioned by Supabase.
 * Vercel's Supabase integration exposes this as POSTGRES_URL.
 * Keep a single canonical runtime database variable so the old database
 * configuration cannot silently reconnect to a previous provider.
 */
export function getDatabaseUrl(): string | null {
  const value = process.env.POSTGRES_URL;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const p = getPool();
  if (!p) throw new Error('POSTGRES_URL is not configured for the Supabase database');
  return p.query<T>(text, params);
}
