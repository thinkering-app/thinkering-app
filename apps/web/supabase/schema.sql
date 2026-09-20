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
  action text not null check (action in ('feedback', 'activity_report', 'redeem')),
  count integer not null default 0,
  primary key (device_id, day, action)
);

-- Re-runnable on a project created before 'redeem' existed: a code is guessable
-- in a way a feedback message is not, so the attempts have to be counted.
alter table device_actions drop constraint if exists device_actions_action_check;
alter table device_actions add constraint device_actions_action_check
  check (action in ('feedback', 'activity_report', 'redeem'));

-- Codes that raise one device's daily budget (docs/04 §Usage metering). Each
-- is redeemable once, by one device, and only the HMAC of the code is stored:
-- a code is a bearer secret, and nothing here needs to read it back. The
-- bonus is a daily allowance, not a pool, so it fits the per-day accounting
-- the rest of this schema already does — and it scales the per-kind burst
-- limits by the same proportion, so a code lifts both ceilings at once.
create table if not exists budget_codes (
  code_hash text primary key,
  -- Who it was issued to, for reading the table back. Never a device or a user.
  label text not null,
  daily_bonus_weighted bigint not null check (daily_bonus_weighted > 0),
  -- When the grant stops applying; null never expires.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  redeemed_by uuid references devices (device_id),
  redeemed_at timestamptz
);

create index if not exists budget_codes_device_idx on budget_codes (redeemed_by)
  where redeemed_by is not null;

-- Token totals across every device for a day: the proxy-wide daily cap
-- (docs/04 §Usage metering), a backstop for however many devices exist.
create table if not exists usage_totals (
  day date primary key,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0
);

-- Rate-limit counters for unsigned routes, keyed by an HMAC of the day and the
-- caller's IP address (never the address itself). Registration is the only one:
-- it is how a caller gets a device, so it can't be limited per device.
create table if not exists ip_actions (
  ip_hash text not null,
  day date not null,
  action text not null check (action in ('register')),
  count integer not null default 0,
  primary key (ip_hash, day, action)
);

-- Spend alert levels (percent of the proxy-wide cap) already emailed for a
-- day, so each fires once however many calls cross it.
create table if not exists spend_alerts (
  day date not null,
  level integer not null,
  sent_at timestamptz not null default now(),
  primary key (day, level)
);

alter table devices enable row level security;
alter table budget_codes enable row level security;
alter table device_usage enable row level security;
alter table device_actions enable row level security;
alter table usage_totals enable row level security;
alter table ip_actions enable row level security;
alter table spend_alerts enable row level security;

-- The daily spend at a glance, for the dashboard's SQL editor or a report:
-- `select * from spend_by_day order by day desc`. Weighted as the cap counts
-- it (docs/04 §Usage metering); the dollars use Sonnet 5 list prices, so they
-- run slightly high. security_invoker keeps usage_totals' RLS in force, so it
-- is as closed to anon and authenticated as the table itself.
create or replace view spend_by_day with (security_invoker = true) as
select
  day,
  input_tokens,
  output_tokens,
  input_tokens + 4 * output_tokens as weighted,
  round((input_tokens * 2 + output_tokens * 10) / 1e6, 2) as approx_usd
from usage_totals;

revoke all on spend_by_day from public, anon, authenticated;

-- Metering in one atomic step (docs/04 §Usage metering). The proxy reserves a
-- call's maximum output before calling the model and settles the real count
-- afterwards; the upsert's row lock serialises concurrent calls from a device,
-- so each sees the reservations of the ones still in flight. Returns the
-- device's day, the proxy-wide totals after the change, and any budget the
-- device has been granted by code — folded in here rather than fetched
-- separately, since every generation needs it and this already runs.
create or replace function add_device_usage(
  p_device_id uuid,
  p_day date,
  p_counters text[],
  p_calls integer,
  p_input_tokens bigint,
  p_output_tokens bigint
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  counter text;
  device device_usage%rowtype;
  total usage_totals%rowtype;
begin
  insert into device_usage as u (device_id, day, input_tokens, output_tokens, calls)
  values (p_device_id, p_day, p_input_tokens, p_output_tokens, p_calls)
  on conflict (device_id, day) do update set
    input_tokens = u.input_tokens + excluded.input_tokens,
    output_tokens = u.output_tokens + excluded.output_tokens,
    calls = u.calls + excluded.calls
  returning * into device;

  foreach counter in array coalesce(p_counters, '{}') loop
    update device_usage
    set kind_calls = jsonb_set(
      kind_calls,
      array[counter],
      to_jsonb(coalesce((kind_calls ->> counter)::integer, 0) + p_calls)
    )
    where device_id = p_device_id and day = p_day
    returning * into device;
  end loop;

  insert into usage_totals as t (day, input_tokens, output_tokens)
  values (p_day, p_input_tokens, p_output_tokens)
  on conflict (day) do update set
    input_tokens = t.input_tokens + excluded.input_tokens,
    output_tokens = t.output_tokens + excluded.output_tokens
  returning * into total;

  return jsonb_build_object(
    'input_tokens', device.input_tokens,
    'output_tokens', device.output_tokens,
    'calls', device.calls,
    'kind_calls', device.kind_calls,
    'total_input_tokens', total.input_tokens,
    'total_output_tokens', total.output_tokens,
    'bonus_weighted', device_bonus_weighted(p_device_id)
  );
end;
$$;

-- Extra daily budget a device holds, from every unexpired code it has
-- redeemed. Zero for a device that has redeemed none.
create or replace function device_bonus_weighted(p_device_id uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(daily_bonus_weighted), 0)::bigint
  from budget_codes
  where redeemed_by = p_device_id
    and (expires_at is null or expires_at > now());
$$;

/*
 * Claims a code for a device, atomically: the `redeemed_by is null` predicate
 * inside the update is the race guard, so two devices racing the same code
 * cannot both win. Returns the bonus granted, or null if the code is unknown,
 * expired or already used — the caller must not tell those apart, or the
 * route becomes an oracle for which codes exist.
 */
create or replace function redeem_budget_code(p_code_hash text, p_device_id uuid)
returns bigint
language sql
set search_path = public
as $$
  update budget_codes
  set redeemed_by = p_device_id, redeemed_at = now()
  where code_hash = p_code_hash
    and redeemed_by is null
    and (expires_at is null or expires_at > now())
  returning daily_bonus_weighted;
$$;

create or replace function count_ip_action(p_ip_hash text, p_day date, p_action text)
returns integer
language sql
set search_path = public
as $$
  insert into ip_actions as a (ip_hash, day, action, count)
  values (p_ip_hash, p_day, p_action, 1)
  on conflict (ip_hash, day, action) do update set count = a.count + 1
  returning count;
$$;

-- Supabase grants execute on new functions to anon and authenticated; these
-- belong to the secret key alone, like the tables they write.
revoke execute on function add_device_usage(uuid, date, text[], integer, bigint, bigint)
  from public, anon, authenticated;
grant execute on function add_device_usage(uuid, date, text[], integer, bigint, bigint) to service_role;
revoke execute on function count_ip_action(text, date, text) from public, anon, authenticated;
grant execute on function count_ip_action(text, date, text) to service_role;
revoke execute on function device_bonus_weighted(uuid) from public, anon, authenticated;
grant execute on function device_bonus_weighted(uuid) to service_role;
revoke execute on function redeem_budget_code(text, uuid) from public, anon, authenticated;
grant execute on function redeem_budget_code(text, uuid) to service_role;

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
