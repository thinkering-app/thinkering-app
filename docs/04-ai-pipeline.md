# 04 — AI pipeline

Every LLM call has a `kind` id, a versioned prompt template in `packages/core/prompts`, a Zod output schema, and a row in the local `llm_calls` table. The client never sends raw prompts to the proxy — it sends `{kind, params}` and the server renders the same template (BYO-key mode renders client-side).

## Generation map

| id  | kind                | Trigger                                                        | Model                      | Latency handling                                                     |
| --- | ------------------- | -------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| G1  | `intake.approach`   | Intake step 2 → 3                                              | Sonnet                     | Background; user is answering step 3                                 |
| G2  | `intake.topics`     | Intake step 3 → 4 (awaits G1)                                  | Sonnet                     | Background; step 4 buys time; brief branded wait if needed           |
| G3  | `intake.path`       | Intake step 5 → 6                                              | Sonnet                     | Streamed onto step 6 (name first, then goals)                        |
| G4  | `resources.search`  | Intake complete                                                | Sonnet + web_search tool   | Fully background; resources appear when ready                        |
| G5a | `today.plan`        | App open / interest created / plan stale (new local date)      | Haiku                      | Fast (~1–2s); cached per interest per day in `gen_cache`             |
| G5b | `activity.generate` | Card tap (Next card prefetched after G5a)                      | Sonnet                     | Streamed; page 1 renders as soon as it parses (~2–4s to first page)  |
| G6  | `activity.review`   | User finishes the last interactive page before the review slot | Haiku                      | Runs while user reads the following page; soft skeleton if not ready |
| G7  | `activity.question` | Ask button                                                     | Sonnet                     | Streamed into the inserted page                                      |
| G8  | `reflect.update`    | Reflection flow submit                                         | Sonnet                     | Streamed suggestions                                                 |
| G9  | `path.suggestGoals` | Path opened & cache stale (path changed)                       | Haiku                      | Background; cached                                                   |
| G10 | `resource.describe` | User adds a link                                               | Haiku (+ server URL fetch) | Inline (~2s), editable draft                                         |
| G11 | `routine.customize` | Routine free-text submit                                       | Haiku                      | Inline, one-line confirmation                                        |

### Contracts (summary — full Zod schemas in `packages/core/schemas`; keys are camelCase there, matching ActivityDoc, even where this summary shows snake_case)

- **G1 →** `{domain, approach_notes, pitfalls, progression_principles}` — effective approaches, topic progressions, and pedagogy for this domain given their why + experience. Stored on the interest (editable). Reused as context by G2/G3/G5/G8.
- **G2 →** `{topics: [{label, origin: motivation|foundational|adjacent, blurb}]}` (~10).
- **G3 →** `{name, goals: [{title, description, concepts: [{label, kind: concept|skill}]}]}` — 5–8 goals, pedagogically sequenced, each scoped to one session (5 min session → introducible in 5; 10/15 → 5–10 min of new material). Concept/skill items become the goal's first-class concepts (D16); ids assigned on save.
- **G4 →** `{resources: [{url, title, description, how_to_use, summary, goal_titles[]}]}` — reputable articles/videos matched to specific goals.
- **G5a →** per section: `[{goal_id, library_item_id, title, est_minutes}]` — respects scheduler-chosen goals (the scheduler picks goals; G5a picks the library item from the active set and writes a human title).
- **G5b →** an Activity Document (`05-activity-format.md`), including the empty reserved review page. Declares which of the goal's concept/skill ids it targets so coverage and in-activity highlighting work (D16).
- **G6 →** content blocks for the review page: respond to / build on / correct the highest-value thing in their responses.
- **G7 →** one new page (content + optional interaction) answering the question.
- **G8 →** `{observations, suggested_changes: [{type: add|reorder|revise|remove, …}], suggested_goals[]}`.
- **G9 →** `{goals: [{title, description, concepts[]}] (3)}`.
- **G10 →** `{title, description, how_to_use, summary}`.
- **G11 →** `{activations: [{section, library_item_id, active}], note}` — note saved to `routine_notes`.

## Context assembly

A deterministic builder in `packages/core/context` produces the per-interest context block used by G3/G5/G6/G7/G8: intake answers, approach notes, goal list + statuses, recent activity history (titles + ratings, last ~10), active library items, contexts (projects/people — G5b apply-tier only), relevant resources, routine notes. Budgeted (~2–3k tokens) and ordered stable-first for prompt caching.

## Latency & cost strategy

- **Structure**: system preamble (product explanation + library definitions + activity JSON schema + pedagogy guidance) is identical across calls of a kind → **prompt caching** (`cache_control` breakpoint after the preamble). Per-interest context comes next (stable ordering), volatile params last.
- **Streaming everywhere user-facing**: SSE passthrough from the proxy; client uses incremental JSON parsing to render Activity Document pages as each page object closes.
- **Right-size models** (D11): Haiku for metadata-shaped calls (G5a, G6, G9, G10, G11), Sonnet where pedagogy/quality dominates (G1–G4, G5b, G7, G8). Model ids live in one config map — easy to tune per kind.
- **Prefetch, don't pre-generate everything**: only the Next card's full activity is prefetched (highest likelihood of use). Strengthen/Go further generate on tap with streaming. Completed-activity docs are kept locally, so replay/history is free.
- **Cache aggressively**: G5a per interest+date; G9 per path hash; regenerating requires explicit user action.
- Max_tokens tuned per kind. Temperature applies to **Haiku kinds only** — Sonnet 5 rejects sampling parameters (temperature/top_p/top_k), so Sonnet kinds run at the model default; lower temperature is set on extraction-shaped Haiku kinds (G5a, G10, G11).

## Usage metering (default proxy mode)

- Budget (D14): **per-device daily token budget** (weighted: output tokens ×4 input; cached input ~free) sized for the beta at roughly **60 generations/day** — comfortably an intake + a heavy day of activities across interests. **Reserved headroom**: in-activity calls (G6 review, G7 Ask) draw from a protected slice of the budget so an activity in progress can always finish its responsive pieces even if generation-heavy kinds hit the cap. Server tracks in `device_usage`; responses include remaining-budget headers the app mirrors in Me → AI usage.
- On exhaustion: 429 + reset time → app shows a calm "you've used today's included generation" state; existing activities, history, and path remain fully usable. BYO key bypasses the meter.
- Per-kind burst limits (e.g. max N intake runs/day/device) to prevent abuse of the expensive kinds.

## Failure handling

- All calls: one automatic retry on transient failure; schema-invalid output → one repair round-trip (send validation errors back), then a user-visible "couldn't generate, try again" state. Never render unvalidated output.
- G6 not ready when the user reaches the review page: show it as "one more look at your answers…" skeleton for up to ~5s, then gracefully convert the page to a generic summary if the call failed.
- Aborted streams (user backs out): mark `llm_calls.status = aborted`; keep partial doc only if ≥1 valid page.

## Observability

- **Local**: `llm_calls` table + AI Inspector screen (prompt, response, tokens, latency, est. cost). This is the primary prompt-iteration loop.
- **Server**: per-kind counters (count, tokens, p50/p95 latency, error rate) — aggregate only, no prompt/response bodies logged server-side (privacy).
- **PostHog**: `ai_call` event with kind, model, latency bucket, ok/error — no content (see `08`).

## Prompt authoring guidelines

- Templates are TS functions returning `{system, messages}` — typed params, no string soup. Each has a `PROMPT_VERSION` recorded in `llm_calls`.
- Keep pedagogy instructions in one shared module (`prompts/pedagogy.ts`) so G1/G3/G5b stay consistent (retrieval practice, worked examples, spacing, interleaving, transfer, cognitive-load management, misconception handling).
- Tone rules for generated content mirror the app's: plain, warm, adult, concise; no filler praise. **Never patronize or assume**: app history is not the user's whole knowledge — they may know things they haven't done here, so avoid "you haven't learned X yet" framings; phrase recaps as "in thinkering you've covered…" and treat prior knowledge as plausible.
- Fixtures: each kind has input fixtures + a golden-ish output checked by schema (not string equality) in vitest; a `pnpm prompt:run <kind>` script runs a kind against a fixture for manual iteration.
