# 04 — AI pipeline

Every LLM call has a `kind` id, a versioned prompt template in `packages/core/prompts`, a Zod output schema, and a row in the local `llm_calls` table. The client never sends raw prompts to the proxy — it sends `{kind, params}` and the server renders the same template (BYO-key mode renders client-side).

## Generation map

| id  | kind                | Trigger                                                        | Model                      | Latency handling                                                                                                                                  |
| --- | ------------------- | -------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | `intake.approach`   | Intake step 2 → 3                                              | Sonnet                     | Background; user is answering step 3                                                                                                              |
| G2  | `intake.topics`     | Intake step 3 → 4 (awaits G1)                                  | Sonnet                     | Background; brief branded wait on step 4 if needed                                                                                                |
| G2b | `intake.success`    | Intake step 3 → 4 (alongside G2; doesn't wait on G1)           | Sonnet                     | Background; shown on step 5, with step 4 to finish                                                                                                |
| G3  | `intake.path`       | Intake step 5 → 6                                              | Sonnet                     | Step 6 (time) buys time; streamed onto step 7 (name first, then goals)                                                                            |
| G4  | `resources.search`  | Intake complete                                                | Sonnet + web_search tool   | Fully background; resources appear when ready                                                                                                     |
| G5a | `today.plan`        | App open / interest created / plan stale (new local date)      | Haiku                      | Fast (~3–4s); the day's `planned` activity rows are the cache                                                                                     |
| G5b | `activity.generate` | Card tap (Next card prefetched after G5a)                      | Sonnet                     | Streamed; page 1 renders as soon as it parses. 40–60s and 4–6k output tokens end to end for a 10-minute activity, so the stream is the experience |
| G6  | `activity.review`   | User finishes the last interactive page before the review slot | Haiku                      | Runs while user reads the following page; soft skeleton if not ready                                                                              |
| G7  | `activity.question` | Ask button                                                     | Sonnet                     | Streamed into the inserted page                                                                                                                   |
| G8  | `reflect.update`    | Reflection flow submit                                         | Sonnet                     | Streamed suggestions                                                                                                                              |
| G9  | `path.suggestGoals` | Path opened & cache stale (path changed)                       | Haiku                      | Background; cached                                                                                                                                |
| G10 | `resource.describe` | User adds a link                                               | Haiku (+ server URL fetch) | Inline (~2s), editable draft                                                                                                                      |
| G11 | `routine.customize` | Routine free-text submit                                       | Haiku                      | Inline, one-line confirmation                                                                                                                     |

### Contracts (summary — full Zod schemas in `packages/core/schemas`; keys are camelCase there, matching ActivityDoc, even where this summary shows snake_case)

- **G1 →** `{domain, approach_notes, pitfalls, progression_principles}` — effective approaches, topic progressions, and pedagogy for this domain given their why, and their experience when it is known. Intake does not know it: G1 fires as the user _enters_ the experience question (docs/01 step 2 → 3), so experience is an optional param and the prompt asks for notes that hold across levels and say what changes with more of it. A later re-run from path settings can supply it. Stored on the interest (editable). Reused as context by G2/G3/G5/G8. Every field is word-budgeted: G2 waits on this call, so a long brief is a long wait.
- **G2 →** `{topics: [{label, origin: motivation|foundational|adjacent, blurb}]}` (~10). Topics the learner adds on the same step are saved with origin `user`.
- **G2b →** `{outcomes: string[]}` — 3–5 short, first-person, deliberately varied answers to "What would feel like success?" (understanding, doing, making, a real moment, confidence or habit). The picked and written ones go to G3 and are stored on the interest (`success_outcomes`), where context assembly includes them.
- **G3 →** `{name, goals: [{title, description, concepts: [{label, kind: concept|skill}]}]}` — 5–8 goals, pedagogically sequenced, each scoped to one short session (5–15 minutes), leading toward the outcomes they picked. G3 fires before the time question (docs/01 step 5 → 6) so that step covers its wait; session length isn't a param. Concept/skill items become the goal's first-class concepts (D16); labels are 2–5 words because they render as chips, and ids are assigned on save.
- **G4 →** `{resources: [{url, title, description, howToUse, summary, goalTitles[]}]}` — reputable articles/videos matched to specific goals, found with the **web search tool** (`web_search_20260209`, max 6 uses). Templates declare tools abstractly (`PromptTemplate.tools`); the proxy and the BYO-key client own the wire shape and the tool version. A tool-using turn narrates before it answers, so `extractJsonText` also picks the largest balanced object out of surrounding prose. Goal titles are matched back to ids by exact title; an unmatched title is dropped, never guessed at.
- **G5a →** per section: `[{goal_id, library_item_id, title, est_minutes}]` — respects scheduler-chosen goals (the scheduler picks goals; G5a picks the library item from the active set and writes a human title). The client zips the returned cards with the scheduler's picks **by position** and ignores the returned `goal_id` entirely: the scheduler owns the goal, and a hallucinated or stale id must not be able to point a card at the wrong one. A `library_item_id` outside the active set falls back to the first active item rather than generating something the user turned off.
- **G5b →** an Activity Document (`05-activity-format.md`), including the empty reserved review page. Declares which of the goal's concept/skill ids it targets so coverage and in-activity highlighting work (D16).
- **G6 →** content blocks for the review page: respond to / build on / correct the highest-value thing in their responses.
- **G7 →** one new page (content + optional interaction) answering the question.
- **G8 →** `{observations, suggestedChanges: [{type: revise|remove|reorder, ref, reason, …}], suggestedGoals: [{…goal, afterRef, reason}]}`. Goals are addressed by short refs (`G1`, `G2`, …) assigned in path order by the params — short enough to copy without drift, and the client maps them back, dropping any proposal naming a ref that isn't on the path (`planReflection` in `packages/core/path`). Additions live only in `suggestedGoals`: an `add` change type would have been a second way to say the same thing. Every proposal carries a one-line `reason` the learner reads.
- **G9 →** `{goals: [{title, description, concepts[]}] (3)}`. Cached under a path signature that ignores goal status and order (`pathSignature`): progress changing daily is not a changed path, and reordering the same goals doesn't change what's missing from them.
- **G10 →** `{title, description, howToUse, summary, goalTitles[]}` — `goalTitles` is an addition to the original contract, so a pasted link can reach the same goal matching G4 gets; without it, user-added resources would never feed `matchedResources`. The page text comes from `POST /api/fetch-url` on the proxy (`lib/server/page-fetch.ts`): the app never fetches arbitrary URLs itself, and the scheme/private-network/redirect guards and the per-device daily limit live there.
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
- One request shape: the model, limits, thinking, temperature and tools a template decides are built once, by `modelRequestFields` (`packages/core/src/prompts/request.ts`), and spread by the proxy, the BYO-key client and the prompt scripts alike — so a `prompt:run` is the call the app makes. (G4's recordings were made without its web-search tool until this, and invented their links.)

### Thinking

Sonnet 5 thinks unless told otherwise, and the thinking counts against `max_tokens` and precedes the first streamed token. It never reaches the learner: the thinking comes back as separate, empty blocks, and the client reads only text deltas. So every Sonnet kind states an `effort`, and its `max_tokens` leaves room for thinking plus output (a test enforces the first). Before this, G8 spent its whole 3,000-token budget thinking and returned nothing, and G3 was using 3,028 of 4,000.

| Kind                    | Effort | max_tokens | Why                                                                                                                                                                                                            |
| ----------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G5b `activity.generate` | high   | 16000      | Measurably better teaching (2026-09-18: a real discovery built around a test case, plurals covered; low effort hands over the rule on page one). ~37s to first page, largely hidden by the Next-card prefetch. |
| G3 `intake.path`        | high   | 16000      | Better prerequisite ordering; a one-time, streamed moment. ~23s to the first goal; `low` (~1s) is the fallback if it feels long.                                                                               |
| G4 `resources.search`   | high   | 16000      | Background, and only as good as its searching. ~3 min, ~$0.20 per intake.                                                                                                                                      |
| G1, G2, G2b, G7, G8     | low    | 8000       | Short, structured output, or (G7) a learner waiting mid-activity.                                                                                                                                              |

Measured once per level on the committed fixtures; revisit with the AI Inspector if a kind's quality or wait feels off. Stay at 16k or below — the SDK refuses larger non-streaming requests, and the proxy still has a non-streaming path.

## Usage metering (default proxy mode)

- Budget (D14): **per-device daily token budget** (weighted: output tokens ×4 input; cached input ~free) sized for the beta at roughly **60 generations/day** — comfortably an intake + a heavy day of activities across interests. **Reserved headroom**: in-activity calls (G6 review, G7 Ask) draw from a protected slice of the budget so an activity in progress can always finish its responsive pieces even if generation-heavy kinds hit the cap. Server tracks in `device_usage`; responses include remaining-budget headers the app mirrors in Me → AI usage.
- On exhaustion: 429 + reset time → app shows a calm "you've used today's included generation" state; existing activities, history, and path remain fully usable. BYO key bypasses the meter.
- Per-kind burst limits (e.g. max N intake runs/day/device) to prevent abuse of the expensive kinds.

## Failure handling

- All calls: one automatic retry on transient failure; schema-invalid output → one repair round-trip (send validation errors back), then a user-visible "couldn't generate, try again" state. Never render unvalidated output. A document that fails validation is a failure, not a partial success: the pages that streamed before it are discarded with it.
- **Markdown fences**: models wrap JSON in ```json despite the output contract (Haiku on nearly every call). `extractJsonText` strips a wrapping fence at the single parse boundary — cheaper and calmer than a repair round-trip per call.
- **Discriminator drift**: both Sonnet and Haiku emitted `"type"` instead of `"kind"` for blocks while the format was described in prose, which failed every activity document. The block format in `prompts/preamble.ts` spells out the discriminator with an example, and `activity.generate` pins the closing review/summary page pair explicitly — the last page came back as a content page about half the time without it. Both are load-bearing; check `pnpm prompt:check activity.generate` after touching either.
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
