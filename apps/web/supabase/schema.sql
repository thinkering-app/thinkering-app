-- Operational metering tables (docs/02 §Device identity, docs/03 §Supabase).
-- Service-role access only — no RLS policies, so anon/authenticated get nothing.
-- Apply in the Supabase SQL editor (fresh project, D19). User-data mirror
-- tables + RLS ship with M8 (sync).

create table if not exists devices (
  device_id uuid primary key,
  -- The HMAC key issued at registration. Raw, not hashed: the server must be
  -- able to verify request signatures (docs/02). Service-role-only table.
  secret text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  attested boolean not null default false
);

create table if not exists device_usage (
  device_id uuid not null references devices (device_id),
  day date not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  calls integer not null default 0,
  -- Per-kind call counts for burst limits (docs/04).
  kind_calls jsonb not null default '{}'::jsonb,
  primary key (device_id, day)
);

-- Rate-limit counters for the routes that don't spend tokens: private
-- feedback and activity reports (docs/02 §Feedback). Counts only — no
-- submitted content ever lands here.
create table if not exists device_actions (
  device_id uuid not null references devices (device_id),
  day date not null,
  action text not null check (action in ('feedback', 'activity_report')),
  count integer not null default 0,
  primary key (device_id, day, action)
);

alter table devices enable row level security;
alter table device_usage enable row level security;
alter table device_actions enable row level security;
