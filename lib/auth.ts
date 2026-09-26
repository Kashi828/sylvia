import crypto from 'node:crypto';
import { databaseConfigured, query } from '@/lib/db';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Builder' | 'Viewer';
  passwordHash: string;
  createdAt: string;
  active?: boolean;
};

type Session = { token: string; userId: string; expiresAt: number };

const g = globalThis as typeof globalThis & {
  __sylviaAuth?: { users: User[]; sessions: Map<string, Session> };
};

if (!g.__sylviaAuth) {
  const seedPassword = process.env.SYLVIA_DEMO_PASSWORD || 'sylvia-demo';
  const salt = 'sylvia-demo-salt';
  g.__sylviaAuth = {
    users: [{
      id: 'usr_owner',
      name: 'SYLVIA Owner',
      email: 'owner@sylvia.local',
      role: 'Owner',
      passwordHash: crypto.scryptSync(seedPassword, salt, 64).toString('hex'),
      createdAt: new Date().toISOString(),
      active: true,
    }],
    sessions: new Map(),
  };
}

export const authStore = g.__sylviaAuth!;
export const sessionCookie = 'sylvia_session';
const SESSION_DAYS = 7;

function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function passwordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password: string, storedHash: string, salt: string) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function ensureDatabaseOwner() {
  if (!databaseConfigured()) return null;

  const password = process.env.SYLVIA_DEMO_PASSWORD || (
    process.env.NODE_ENV === 'production' ? null : 'sylvia-demo'
  );
  if (!password) throw new Error('SYLVIA_DEMO_PASSWORD must be configured in production');

  const email = (process.env.SYLVIA_OWNER_EMAIL || 'owner@sylvia.local').trim().toLowerCase();
  const name = (process.env.SYLVIA_OWNER_NAME || 'SYLVIA Owner').trim() || 'SYLVIA Owner';
  const record = passwordRecord(password);

  await query(
    `INSERT INTO public.app_users (id, name, email, role, password_hash, password_salt)
     VALUES ($1, $2, $3, 'Owner', $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    ['usr_owner', name, email, record.passwordHash, record.passwordSalt],
  );

  const r = await query(
    `SELECT id, name, email, role, password_hash, password_salt, active, created_at
     FROM public.app_users WHERE id = $1 LIMIT 1`,
    ['usr_owner'],
  );
  const row = r.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  await query(
    `INSERT INTO public.workspace_members
       (id, project_id, user_id, name, email, role, status)
     VALUES ($1, 'sylvia-local-workspace', $2, $3, $4, 'Owner', 'Active')
     ON CONFLICT (project_id, email)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       name = EXCLUDED.name,
       role = 'Owner',
       status = 'Active',
       updated_at = NOW()`,
    ['member_usr_owner', 'usr_owner', String(row.name), String(row.email)],
  );

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as User['role'],
    passwordHash: String(row.password_hash),
    createdAt: new Date(String(row.created_at)).toISOString(),
    active: Boolean(row.active),
    passwordSalt: String(row.password_salt),
  };
}

export async function verifyCredentials(email: string, password: string) {
  if (databaseConfigured()) {
    const owner = await ensureDatabaseOwner();
    const target = email.trim().toLowerCase();
    let row: Record<string, unknown> | undefined;

    if (owner && owner.email.toLowerCase() === target) {
      row = owner as Record<string, unknown>;
    }

    if (!row) {
      const r = await query(
        `SELECT id, name, email, role, password_hash, password_salt, active, created_at
         FROM public.app_users
         WHERE lower(email) = lower($1) AND active = true
         LIMIT 1`,
        [target],
      );
      row = r.rows[0] as Record<string, unknown> | undefined;
    }

    if (!row || !Boolean(row.active)) return null;

    return verifyPassword(password, String(row.password_hash), String(row.password_salt))
      ? {
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          role: String(row.role) as User['role'],
          passwordHash: String(row.password_hash),
          createdAt: new Date(String(row.created_at)).toISOString(),
          active: true,
        }
      : null;
  }

  const u = authStore.users.find(
    x => x.email.toLowerCase() === email.trim().toLowerCase(),
  );

  return u && verifyPassword(password, u.passwordHash, 'sylvia-demo-salt') ? u : null;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS);

  authStore.sessions.set(token, {
    token,
    userId,
    expiresAt: expiresAt.getTime(),
  });

  if (databaseConfigured()) {
    await query(
      `INSERT INTO public.app_sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId,
        hashSessionToken(token),
        expiresAt.toISOString(),
      ],
    );
    await query(
      `DELETE FROM public.app_sessions
       WHERE expires_at < NOW() OR revoked_at IS NOT NULL`,
    );
  }

  return token;
}

export async function getSessionUserAsync(token: string | undefined) {
  if (!token) return null;

  if (databaseConfigured()) {
    const r = await query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at, u.password_hash, s.expires_at
       FROM public.app_sessions s
       JOIN public.app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.active = true
       LIMIT 1`,
      [hashSessionToken(token)],
    );

    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      authStore.sessions.delete(token);
      return null;
    }

    void query(
      `UPDATE public.app_sessions SET last_seen_at = NOW()
       WHERE token_hash = $1`,
      [hashSessionToken(token)],
    ).catch(() => undefined);

    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      role: String(row.role) as User['role'],
      passwordHash: String(row.password_hash),
      createdAt: new Date(String(row.created_at)).toISOString(),
      active: true,
    };
  }

  const s = authStore.sessions.get(token);
  if (!s || s.expiresAt < Date.now()) {
    if (s) authStore.sessions.delete(token);
    return null;
  }

  return authStore.users.find(u => u.id === s.userId) || null;
}

export async function deleteSessionAsync(token: string | undefined) {
  if (token && databaseConfigured()) {
    await query(
      `UPDATE public.app_sessions
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hashSessionToken(token)],
    );
  }
  if (token) authStore.sessions.delete(token);
}

export function getSessionUser(token: string | undefined) {
  if (!token) return null;
  const s = authStore.sessions.get(token);
  if (!s || s.expiresAt < Date.now()) {
    if (s) authStore.sessions.delete(token);
    return null;
  }
  return authStore.users.find(u => u.id === s.userId) || null;
}

export function deleteSession(token: string | undefined) {
  if (token) authStore.sessions.delete(token);
}

export function publicUser(u: User | null) {
  return u
    ? { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }
    : null;
}
