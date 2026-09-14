-- PostgreSQL starting point for the future managed/cloud deployment.
create extension if not exists pgcrypto;
create table if not exists users(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  created_at timestamptz not null default now()
);
create table if not exists projects(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists project_members(
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check(role in ('Owner','Admin','Builder','Viewer')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create table if not exists devices(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type text not null,
  token_hash text not null,
  online boolean not null default false,
  last_seen timestamptz
);
create table if not exists datastreams(
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  name text not null,
  value_type text not null check(value_type in ('Number','Boolean','String')),
  unit text,
  created_at timestamptz not null default now()
);
create table if not exists telemetry_events(
  id bigserial primary key,
  datastream_id uuid not null references datastreams(id) on delete cascade,
  value_json jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists telemetry_events_stream_time on telemetry_events(datastream_id,created_at desc);
