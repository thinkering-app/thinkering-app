# 03 — Data model

SQLite via Drizzle (`packages/db`). Conventions: `id` = client-generated UUIDv7 (time-ordered); timestamps epoch ms UTC; synced tables carry `updated_at` + `deleted_at` (soft delete). JSON columns hold Zod-validated payloads. ⟳ = synced to Supabase when backup is on.

## interests ⟳

| column                               | type    | notes                                                     |
| ------------------------------------ | ------- | --------------------------------------------------------- |
| id                                   | text pk |                                                           |
| name                                 | text    | short display name (generated in G3, editable)            |
| want_to_learn                        | text    | intake step 1                                             |
| why_choice                           | text    | `career \| personal_goal \| fun`                          |
| why_text                             | text?   |                                                           |
| experience_choice                    | text    | `getting_started \| explored \| in_middle \| experienced` |
| experience_text                      | text?   |                                                           |
| success_outcomes                     | json?   | `string[]`, what they're hoping for (intake step 5)       |
| frequency                            | text    | `daily \| several_weekly \| when_i_can`                   |
| session_minutes                      | int     | 5 / 10 / 15 / custom value                                |
| approach_notes                       | text    | from G1, editable in path settings                        |
| status                               | text    | `focus \| exploring \| archived`                          |
| sort_order                           | real    | fractional ordering                                       |
| created_at / updated_at / deleted_at | int     |                                                           |

## topics ⟳ — intake topic chips + later additions

`id, interest_id fk, label, origin (motivation | foundational | adjacent | user), selected int(bool), sort_order, created_at, updated_at, deleted_at`

## goals ⟳

| column                                       | type | notes                                                                                                                                               |
| -------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| id / interest_id                             |      |                                                                                                                                                     |
| title                                        | text | short                                                                                                                                               |
| description                                  | text | one-two lines                                                                                                                                       |
| concepts                                     | json | `{id, label, kind: 'concept' \| 'skill'}[]` — the key concepts and skills beneath this goal (D16). Ids are stable so activities can reference them. |
| status                                       | text | `not_started \| introduced \| strengthened \| applied`                                                                                              |
| sort_order                                   | real | path order                                                                                                                                          |
| source                                       | text | `intake \| suggestion \| reflection \| user`                                                                                                        |
| introduced_at / strengthened_at / applied_at | int? | for spaced-review ordering                                                                                                                          |
| created_at / updated_at / deleted_at         | int  |                                                                                                                                                     |

Concept **coverage** (which concepts/skills have been targeted — shown when a goal is expanded in Path) is derived, not stored: join completed activities' `doc.concepts[].goalConceptId` against the goal's concept ids.

## activities ⟳

| column                               | type  | notes                                                                                         |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------------- |
| id / interest_id / goal_id           |       | `goal_id` null only on the strengthen prerequisite card, or a + card asked for without a goal |
| topic                                | text? | a goal-less card's topic: the prerequisite's, or a short name for the learner's request       |
| focus                                | text? | what the learner asked a + card to focus on, or how to learn it; passed to G5b (docs/01 §3)   |
| section                              | text  | `next \| strengthen \| go_further`                                                            |
| tier                                 | text  | `introduce \| strengthen \| apply`                                                            |
| library_item_id                      | text  | e.g. `worked-example`                                                                         |
| title / est_minutes                  |       | shown on card                                                                                 |
| doc                                  | json? | Activity Document (null until G5b generates content)                                          |
| status                               | text  | `planned \| ready \| in_progress \| completed \| abandoned`                                   |
| current_page                         | int   | resume point                                                                                  |
| planned_for                          | text  | local date `YYYY-MM-DD` the scheduler planned it for                                          |
| started_at / completed_at            | int?  |                                                                                               |
| rating                               | text? | `down \| mixed \| up`                                                                         |
| rating_text                          | text? |                                                                                               |
| created_at / updated_at / deleted_at | int   |                                                                                               |

History = completed activities (indexed on `interest_id, completed_at`). Calendar = distinct local dates of `completed_at`.

## responses ⟳ — user answers inside activities

`id, activity_id fk, page_id, block_id, payload json (typed per block kind), created_at, updated_at, deleted_at`

Kept separate from `doc` so generation (G6) and future features can query them.

## resources ⟳

`id, interest_id, url, title, description, how_to_use text?, summary text? (not shown in UI), source (user | suggested), goal_ids json?, created_at, updated_at, deleted_at`

## contexts ⟳ — projects/environments/people (path settings)

`id, interest_id, kind (project | environment | person), label, notes text?, created_at, updated_at, deleted_at`

## reflections ⟳

`id, interest_id, feeling_text, changes json (accepted path edits summary), created_at, updated_at, deleted_at`

`changes` is `{added, removed, revised, reordered}` goal titles, plus `outcomes: {before, after}` when the reflection changed what they're hoping for (the interest's `success_outcomes` then holds `after`).

## library_prefs ⟳ — per-interest activation of library items

`id, interest_id, section, library_item_id, active int(bool), updated_at, deleted_at`

Absent row = library item's default activation. Library definitions themselves live in code (`packages/core/library`), not the DB.

## routine_notes ⟳ — free-text routine customization (G11)

`id, interest_id? (null = global), note, created_at, updated_at, deleted_at`

## gen_cache — local only

`id, kind (daily_plan | goal_suggestions | …), scope_key text (e.g. interest_id + local date), payload json, created_at, expires_at`

Caches G9 suggestions and anything else keyed by scope. Safe to wipe — nothing here is a source of truth. G5a's daily plan is **not** cached here: its `planned` activity rows are the durable artifact (they hold the document, resume point and responses), so caching the plan separately would be a second source of truth for the same thing.

## llm_calls — local only, for the AI Inspector

`id, kind, model, interest_id?, activity_id?, request json (rendered messages/system), response json, input_tokens, output_tokens, latency_ms, status (ok | error | aborted), error text?, created_at`

Pruned to last ~200 calls. Never synced.

## analytics_buffer — local only

`id, event, properties json, created_at` — **unused.** It held events until the learner answered an opt-in ask; since analytics became on by default (D9) nothing writes to it. It stays because migrations don't drop tables, and `clearAllData` still empties it. Never synced.

## settings — local key/value

`key pk, value json` — device_id + secret ref, `backup_enabled` (default false), `sync_state` (`{lastPullAt, lastPushAt, lastSyncedAt}` — cursors stayed here rather than becoming their own table: two numbers and a timestamp, none of it synced), `ai_mode`, `posthog_opt_in` (absent means on — only a no is written, `08`; `posthog_consent_decided` is left over from the opt-in ask and no longer read), `installed_at` (first launch, for the `days_since_install` bucket — never sent raw), `posthog_storage.*` (PostHog's own key/value store, kept here so the SDK adds no file of its own), byok flag (key itself in SecureStore), last_seen_version, `intake_draft` (the one unfinished intake, docs/01 §1: answers, current step and each finished G1/G2/G3 output with the key it was made from; parsed through `intakeDraftSchema` on read and cleared if it no longer fits, and cleared when the interest is saved — never synced or exported).

## Supabase (server) tables

- `sync_rows(user_id uuid, table_name, id, updated_at, deleted_at, schema_version, data jsonb)` — one row per synced local row, its columns carried as JSON, primary key `(user_id, table_name, id)`, RLS `user_id = auth.uid()` (and a `schema_version` floor on write, docs/02 D17). One generic table rather than a mirror per ⟳ table: nothing server-side reads inside `data`, and a local migration is then never a server migration.
- `devices(device_id, secret, platform, created_at, attested bool)` and `device_usage(device_id, day, input_tokens, output_tokens, calls, kind_calls json)` — operational, reached only with the secret key (the `service_role` Postgres role). The device secret is stored raw, not hashed: the server must verify HMAC request signatures (docs/02), which a one-way hash cannot do; nothing but the secret key can read the table, and App Attest hardens issuance later. `kind_calls` carries per-kind counts for the burst limits in `04`. `usage_totals(day, input_tokens, output_tokens)` is the proxy-wide daily sum, written in the same atomic step (`add_device_usage`); `ip_actions(ip_hash, day, action, count)` counts device registrations per hashed address (`02`). `spend_alerts(day, level, sent_at)` records which spend alert levels have emailed for a day, and the `spend_by_day` view reads `usage_totals` for the dashboard (`04`).

## Invariants

- Goal status only moves forward; timestamps set once per transition (completing a strengthen activity on an `applied` goal updates `strengthened_at` but not status).
- A section has at most one scheduler-planned open card (`planned | ready | in_progress`) per interest, whatever its `planned_for` date — unfinished cards carry over and are never abandoned by the day turning. A section with none gets its next card when Today opens, skipping goals it already had that day. + cards add to this. A configure change drops that section's _untouched_ cards and re-plans only that section — anything started or completed stays.
- Deleting an interest soft-deletes its children (cascade in application code).
