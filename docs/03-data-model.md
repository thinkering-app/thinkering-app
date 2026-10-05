# 03 — Data model

SQLite via Drizzle. The columns live in `packages/db/src/schema.ts`, which is the source of truth; this doc covers what each table is for and the rules the schema can't show.

Conventions: `id` is a client-generated UUIDv7 (time-ordered). Timestamps are epoch ms UTC; day boundaries use the device's local timezone (D12). JSON columns hold Zod-validated payloads. ⟳ = synced to Supabase when backup is on; every synced table carries `updated_at` and `deleted_at`, and synced rows are soft-deleted, never hard-deleted.

## Synced tables ⟳

- **interests** — an interest and its intake answers (why, experience, `success_outcomes`, frequency, session length, `reading_amount`), `weekly_days` — the week dots' target, null to follow the frequency, 0 for none (`01` §3), `approach_notes` from G1 (editable), `approach_brief` (G1's hidden brief, JSON; null until written, cleared when the answers it came from change — `docs/04`), `status` (`focus | exploring | archived`) and a fractional `sort_order`.
- **topics** — intake topic chips and later additions. `origin` is `motivation | foundational | adjacent | user`.
- **goals** — ordered by `sort_order`. `status` is `not_started | introduced | strengthened | applied`. `concepts` is `{id, label, kind: 'concept' | 'skill'}[]` (D16); the ids are stable so activities can reference them. `introduced_at` / `strengthened_at` / `applied_at` drive spaced-review ordering. `source` is `intake | suggestion | reflection | user`.
- **activities** — one card and, once written, its Activity Document (`doc`, null until G5b). `section` (`next | strengthen | go_further`), `tier` (`introduce | strengthen | apply`), `library_item_id`, `status` (`planned | ready | in_progress | completed | abandoned`), `current_page` as the resume point, `planned_for` as the local date the scheduler planned it for, and the learner's `rating`. `goal_id` is null only on the Strengthen prerequisite card or a + card made without a goal; those carry a `topic` instead. `focus` is what the learner asked a + card for, passed to G5b (`01` §3); `resource_id` is the saved resource they chose for it, when its type is built around one.
- **responses** — the learner's answers inside activities, one row per block, `payload` typed per block kind. Kept apart from `doc` so G6 and later features can query them.
- **resources** — links for an interest. `source` is `user | suggested`; `summary` feeds generation and isn't shown; `goal_ids` ties a resource to goals.
- **contexts** — projects, environments and people from Path settings, used by Go further activities.
- **reflections** — a Reflection's `feeling_text` and `changes`: `{added, removed, revised, reordered}` goal titles, plus `outcomes: {before, after}` on older reflections, from when the flow could change what they're hoping for.
- **library_prefs** — per interest and section, whether a library item is active. No row means the item's default. Library definitions live in code (`packages/core/src/library`), not the database.
- **routine_notes** — free-text routine preferences from G11; a null `interest_id` means global.

History is completed activities (indexed on `interest_id, completed_at`). The calendar is the distinct local dates of `completed_at`, and its streak and Today's week dots are read from the same dates (`packages/core` `history/rhythm`). Concept coverage is derived, not stored: completed activities' `doc.concepts[].goalConceptId` joined against the goal's concept ids.

## Local-only tables

- **gen_cache** — cached generations keyed by scope (e.g. G9 suggestions per path). Safe to wipe; nothing here is a source of truth. G5a's daily plan is deliberately not cached here: its `planned` activity rows are the durable artifact.
- **llm_calls** — every model call for the AI Inspector: rendered request, response, tokens, latency, status. Pruned to the last ~200. Never synced.
- **analytics_buffer** — unused since analytics became on by default (D9). It stays because migrations don't drop tables; `clearAllData` still empties it.

## settings

Local key/value, never synced. Holds the device id and secret ref, `backup_enabled` (default false), `sync_state` (the pull/push cursors), `ai_mode`, the analytics and replay choices (`posthog_opt_in` absent means on — only a no is written, `08`), `installed_at` (for the `days_since_install` bucket, never sent raw), PostHog's own key/value store (`posthog_storage.*`, so the SDK adds no file of its own), the BYO-key flag (the key itself is in SecureStore), `last_seen_version`, and `intake_draft` — the one unfinished intake (`01` §1), parsed through `intakeDraftSchema` on read, cleared if it no longer fits or once the interest is saved, and never synced or exported.

## Supabase (server) tables

Defined in `apps/web/supabase/schema.sql`.

- **`sync_rows`** `(user_id, table_name, id, updated_at, deleted_at, schema_version, data jsonb)` — one row per synced local row, its columns carried as JSON. RLS `user_id = auth.uid()`, plus a `schema_version` floor on write (`02` §Schema evolution). One generic table rather than a mirror per ⟳ table: nothing server-side reads inside `data`, so a local migration is never a server migration.
- **`devices`**, **`device_usage`** — operational, reached only with the secret key (the `service_role` role). The device secret is stored raw, not hashed, because the server must verify HMAC signatures with it (`02` §Device identity). `device_usage.kind_calls` carries the per-kind counts for burst limits (`04`).
- **`usage_totals`** (the proxy-wide daily sum, written in the same atomic step as `device_usage` by `add_device_usage`), **`ip_actions`** (device registrations per hashed address), **`budget_codes`**, **`spend_alerts`**, and the **`spend_by_day`** view — metering and cost controls, `04` §Usage metering.

## Invariants

- Goal status only moves forward, and each transition's timestamp is set once. Completing a strengthen activity on an `applied` goal updates `strengthened_at` but not status.
- A section has at most one scheduler-planned open card (`planned | ready | in_progress`) per interest, whatever its `planned_for` date. Unfinished cards carry over and are never abandoned by the day turning. A section with none gets its next card when Today opens, skipping goals it already had that day. + cards add to this. A configure change drops that section's _untouched_ cards and re-plans only that section; anything started or completed stays.
- Deleting an interest soft-deletes its children (cascade in application code).
