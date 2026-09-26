-- SYLVIA v0.59.0 persistent identity and workspace membership

CREATE TABLE IF NOT EXISTS public.app_users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null default 'Viewer'
    check (role in ('Owner','Admin','Builder','Viewer')),
  password_hash text not null,
  password_salt text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email_lower
  ON public.app_users (lower(email));

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user
  ON public.app_sessions(user_id, expires_at desc);

CREATE INDEX IF NOT EXISTS idx_app_sessions_active
  ON public.app_sessions(token_hash, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id text primary key,
  project_id text not null default 'sylvia-local-workspace',
  user_id text references public.app_users(id) on delete set null,
  name text not null,
  email text not null,
  role text not null default 'Viewer'
    check (role in ('Owner','Admin','Builder','Viewer')),
  status text not null default 'Invited'
    check (status in ('Active','Invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_project
  ON public.workspace_members(project_id, status, role);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON public.workspace_members(user_id, project_id);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
