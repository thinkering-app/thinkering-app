-- Supabase schema (docs/02 §Device identity, docs/03 §Supabase). Apply in the
-- Supabase SQL editor (fresh project, D19).
--
-- Two halves that never mix:
--   * the operational metering tables — reached only with the secret key (the
--     `service_role` Postgres role) and carrying no RLS policies, so anon and
--     authenticated get nothing;
--   * `sync_rows`, the user-data mirror — reached only by the signed-in user's
--     own client through RLS, never with the secret key.

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

-- ── User data mirror (docs/02 §Backup & sync) ───────────────────────────────
--
-- One row per synced local row, its columns carried as JSON. A single generic
-- table rather than a mirror per local table: local schema changes are then
-- never server schema changes, which is exactly what D17 asks of the mirror
-- ("the server stores per-table rows as JSON alongside version", additive-only).
-- Nothing on the server reads inside `data`, so there is nothing to query for.
--
-- `updated_at` / `deleted_at` are client epoch ms — the last-write-wins keys,
-- not server timestamps, so they must stay comparable across devices.

create table if not exists sync_rows (
  user_id uuid not null references auth.users (id) on delete cascade,
  table_name text not null,
  id text not null,
  updated_at bigint not null,
  deleted_at bigint,
  schema_version integer not null,
  data jsonb not null,
  primary key (user_id, table_name, id)
);

-- The pull is always "everything of mine newer than my cursor".
create index if not exists sync_rows_cursor_idx on sync_rows (user_id, updated_at);

alter table sync_rows enable row level security;

-- Own rows only, and only from a build new enough that a newer device can still
-- reconcile what it writes (D17, "update the app to sync"). Raise the floor by
-- re-running this policy when a deprecation window closes; an old client then
-- gets a clear insert failure instead of writing rows nobody can read.
drop policy if exists sync_rows_owner on sync_rows;
create policy sync_rows_owner on sync_rows
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and schema_version >= 1);
