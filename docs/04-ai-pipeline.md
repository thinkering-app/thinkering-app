# 04 — AI pipeline

Every LLM call has a `kind` id, a versioned prompt template in `packages/core/src/prompts`, a Zod output schema, and a row in the local `llm_calls` table. The client never sends raw prompts to the proxy — it sends `{kind, params}` and the server renders the same template (BYO-key mode renders client-side).

## Generation map

| id  | kind                | Trigger                                                                       | Model                      | Latency handling                                                     |
| --- | ------------------- | ----------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| G1  | `intake.approach`   | Intake step 2 → 3                                                             | Sonnet                     | Background; user is answering step 3                                 |
| G2  | `intake.choices`    | Intake step 3 → 4 (awaits G1)                                                 | Sonnet                     | Background; streamed, `topics` first so step 4 shows its chips early |
| G3  | `intake.path`       | Intake step 5 → 6                                                             | Sonnet                     | Step 6 (time) buys time; streamed onto step 7 (name, then goals)     |
| G4  | `resources.search`  | Intake complete                                                               | Sonnet + web_search tool   | Fully background; resources appear when ready                        |
| G5a | `today.plan`        | App open / interest created / plan stale (new local date)                     | Haiku                      | Fast (~3–4s); the day's `planned` activity rows are the cache        |
| G5b | `activity.generate` | Next written ahead after G5a; the other sections on tap (Write)               | Sonnet                     | Streamed; page 1 renders as soon as it parses (40–60s end to end)    |
| G6  | `activity.review`   | User finishes the last interactive page before the review slot                | Haiku                      | Runs while user reads the following page; soft skeleton if not ready |
| G7  | `activity.question` | Ask button                                                                    | Sonnet                     | Streamed into the inserted page                                      |
| G8a | `reflect.open`      | Reflection flow opens & cache stale (path, statuses or last activity changed) | Haiku                      | Background; nothing waits on it; cached                              |
| G8  | `reflect.update`    | Reflection flow submit                                                        | Sonnet                     | Streamed suggestions                                                 |
| G9  | `path.suggestGoals` | Path opened & cache stale (path changed)                                      | Haiku                      | Background; cached                                                   |
| G10 | `resource.describe` | User adds a link                                                              | Haiku (+ server URL fetch) | Inline (~2s), editable draft                                         |
| G11 | `routine.customize` | Routine free-text submit                                                      | Haiku                      | Inline, one-line confirmation                                        |
| G12 | `resources.more`    | **Find more** in the resources panel                                          | Sonnet + web_search tool   | Background like G4; results appear on the next read                  |

### Contracts (summary — full Zod schemas, in camelCase, in `packages/core/src/schemas`)

- **G1 →** `{domain, approach_notes, pitfalls, progression_principles}` — effective approaches, progressions and pedagogy for this domain given their why. It fires before the experience question is answered, so experience is an optional param and the notes hold across levels. Stored on the interest (editable), reused as context by G2/G3/G5/G8. Every field is word-budgeted, because G2 waits on this call.
- **G2 →** `{topics: [{label, origin: motivation|foundational|adjacent, blurb}]}` (~10); topics the learner adds are saved with origin `user`. **Also →** `{outcomes: string[]}` — 3–5 short, first-person, deliberately varied answers to "What would feel like success?". The chosen ones go to G3 and are stored on the interest (`success_outcomes`) for context assembly.
- **G3 →** `{name, goals: [{title, description, concepts: [{label, kind: concept|skill}]}]}` — 5–8 sequenced goals, each one 5–15 minute session, leading toward the chosen outcomes. Concepts become the goal's first-class concepts (D16); labels are 2–5 words because they render as chips, and ids are assigned on save.
- **G4 →** `{resources: [{url, title, description, howToUse, summary, goalTitles[]}]}` — found with the **web search tool** (`web_search_20260209`, max 2 uses). Templates declare tools abstractly (`PromptTemplate.tools`); the proxy and BYO-key client own the wire shape. A tool-using turn narrates before it answers, so `extractJsonText` also picks the largest balanced object out of surrounding prose. Goal titles map back to ids by exact title; an unmatched title is dropped, never guessed at.

  **Exactly two, one to watch and one to read.** `pickResource` falls back to whatever is saved when the media an activity wants is missing, so a lone article would silently turn every Watch Along into a reading. The pair is the cheapest seed that keeps early activities usable; more is the learner's to ask for (G12).

  Each resource must be one page the learner opens — a video, an article, a lesson — not a channel, playlist or homepage, which `groundBlocks` (`packages/core/src/activity/resources.ts`) won't play inline. `checkResources` holds `pnpm prompt:check` to count, media split, host variety and matchable goal titles; the output schema stays looser, since it guards what the app stores.

  **Native only.** Intake auto-searches on iOS and Android, not the web (`AUTO_SEED_RESOURCES` in `apps/mobile/src/resources/seed.ts`): it is the most expensive call per unit of value, and the web build is where people try the app once.

- **G12 →** the same shape as G4, from **Find more**. A separate kind because its search budget differs, and request fields come only from `modelRequestFields`, never a call site. Two to four resources across the whole path, `max 4 uses`, told every URL the learner already has. Duplicates are actually stopped on save (`saveFound`), which re-reads the saved set because links can be added during the search. Unlike G4, a failure is shown.

  **Off for the beta.** Each call is minutes of web search, too much of the shared budget for now. The button stays, disabled and labelled "soon" (`FIND_MORE_ENABLED` in `apps/mobile/src/resources/seed.ts`), and the proxy refuses the kind with a burst limit of 0 (`BURST_LIMITS` in `apps/web/lib/server/metering.ts`), so older builds can't spend it either. Turning it back on is both changes together: the flag to `true`, the limit back to 10.

- **G5a →** per section: `[{goal_id, library_item_id, title, est_minutes}]` — the scheduler picks goals; G5a picks a library item from the active set and writes a title. The client zips cards with the scheduler's picks **by position** and ignores the returned `goal_id`, so a stale or invented id can't misdirect a card. A `library_item_id` outside the active set falls back to the first active item.
- **G5b →** an Activity Document (`05-activity-format.md`), including the empty reserved review page, declaring which of the goal's concept/skill ids it targets (D16).
- **G6 →** content blocks for the review page: respond to / build on / correct the highest-value thing in their responses.
- **G7 →** one new page (content + optional interaction) answering the question.
- **G8a →** `{recap, outcomes: string[]}` — a 1–2 sentence descriptive (never evaluative) recap of recent learning, and 2–3 more outcomes in G2's form that don't repeat the ones they hold.
- **G8 →** `{observations, suggestedChanges: [{type: revise|remove|reorder, ref, reason, …}], suggestedGoals: [{…goal, afterRef, reason}]}`. Goals are addressed by short refs (`G1`, `G2`, …) in path order; the client maps them back and drops any proposal naming a ref not on the path (`planReflection` in `packages/core/src/path`). Additions live only in `suggestedGoals`. Every proposal carries a one-line `reason`. It sees the outcomes as the learner just left them on step 1, and favors changes toward them.
- **G9 →** `{goals: [{title, description, concepts[]}] (3)}`, cached under `pathSignature`, which ignores goal status and order: daily progress and reordering don't change what's missing.
- **G10 →** `{title, description, howToUse, summary, goalTitles[]}`, so a pasted link gets G4's goal matching. Page text comes from `POST /api/fetch-url` (`apps/web/lib/server/page-fetch.ts`): the app never fetches arbitrary URLs itself, and the URL guards and per-device limit live there.
- **G11 →** `{activations: [{section, library_item_id, active}], note}` — note saved to `routine_notes`.

## Context assembly

A deterministic builder (`packages/core/src/prompts/context-assembly.ts`) produces the per-interest context block for G3/G5/G6/G7/G8: intake answers, approach notes, goals + statuses, recent history (titles + ratings, last ~10), active library items, contexts (G5b apply-tier only), relevant resources, routine notes. Budgeted (~2–3k tokens) and ordered stable-first for prompt caching.

## Content language

The learner picks a language in Me → Settings → Language (English, Spanish or Simplified Chinese, defaulting to the device's; docs/00 D23). **Prompts stay in English** whatever the language: they're tuned in English, the model's teaching knowledge doesn't depend on the prompt's language, and one set of templates is all there is to maintain. Instead, every call carries the language — the client sends `language` alongside `{kind, params}`, and `renderPrompt` (`packages/core/src/prompts/language.ts`) renders the template, then appends one system block for any language but English: write natively rather than translate, use references natural to that reader, the register (tú, 你), Chinese punctuation, how to read word limits in Chinese, and extra lines for fill-in-the-blank kinds and resource kinds. The block has no cache mark, so the cached prefix is shared across languages, and English prompts are byte-identical to the template's own render — that's asserted in `prompts.test.ts`, which also snapshots the block text. The template `version`s didn't change with it: the templates didn't.

Only new generations follow the setting; what's already stored stays in the language it was written in. The output schemas' string limits leave room for Spanish, except the interest name, which stays short in every language because it labels chips and tags. Blank grading treats full-width and half-width forms, and closing punctuation, as the same answer. Recordings and fixture mode are English; `pnpm prompt:check <kind> --lang es` runs a kind live in another language (`prompt:run --record` refuses to).

## Latency & cost strategy

- **Structure**: the system preamble (product, library definitions, activity schema, pedagogy) is identical across calls of a kind, with a `cache_control` breakpoint after it. Per-interest context next, volatile params last.
- **Stream everything user-facing**: SSE passthrough; the client parses JSON incrementally and renders each page as it closes. An early release (G2's topics) decides the array is complete from its own closing bracket and every element validating, never from key order. The finished call settles the step either way, so a strict guard only costs a wait.
- **Write ahead only what a day usually starts with**: Next's document is written as soon as G5a lands; Strengthen and Go further are generated on tap (**Write**). Activity documents are the most expensive call, and most days never open the other two.
- **Write ahead, two at a time** (single interest in view; Explore → All only suggests): open cards' documents are written in the background in section order, two streams at a time; a + card skips the queue. Opening a card mid-write joins its stream, and leaving doesn't cancel it. A failed write is silent, not retried that session, and the card offers **Write** — except a write killed by the OS suspending the app, which is requeued on foreground. Completed docs are kept locally.
- **Say where the wait is**: the activity opens straight into the player's frame, showing what was known before the write began — title, goal, library item, minutes — above the wait. It reads "Planning your activity" until the first text arrives, "Writing your activity" until page 1 closes, then "Writing page N…" on Continue. Each label is true when shown: no timers, no invented progress.
- **Right-size models** (D11): Haiku for metadata-shaped calls (G5a, G6, G8a, G9, G10, G11), Sonnet where pedagogy dominates. Model ids live in one map (`MODEL_IDS`).
- **Cache aggressively**: G5a per interest+date; G9 per path signature; regenerating takes explicit user action.
- Temperature applies to **Haiku kinds only** — Sonnet 5 rejects sampling parameters — and is set low on extraction-shaped ones (G5a, G10, G11).
- **One request shape**: model, limits, thinking, temperature and tools are built once by `modelRequestFields` (`packages/core/src/prompts/request.ts`) and spread by the proxy, the BYO-key client and the prompt scripts, so a `prompt:run` is the call the app makes.

### Thinking

Sonnet 5 thinks unless told otherwise; thinking counts against `max_tokens` and delays the first token. The client reads only text deltas, so it never reaches the learner. **Every Sonnet kind states an `effort`, and its `max_tokens` leaves room for thinking plus output** (a test enforces the first) — a budget sized for output alone can go entirely to thinking.

| Kind                    | Effort | max_tokens | Why                                                                                                                                                                             |
| ----------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G5b `activity.generate` | high   | 16000      | Measurably better teaching. ~27s to first page, hidden by writing ahead; medium was ~10s faster but built discoveries less reliably.                                            |
| G3 `intake.path`        | medium | 16000      | Seconds to the first goal against ~25s at high, whose slightly better ordering isn't worth that wait.                                                                           |
| G4 `resources.search`   | low    | 16000      | Background; latency is the searches. Output, mostly thinking, is the cost: at medium a good run took ~3 min and 11k output tokens. Told its search budget (`searchBudgetRule`). |
| G12 `resources.more`    | medium | 16000      | As G4, with a wider brief. Not yet moved to low with G4: Find more is off (`FIND_MORE_ENABLED`), and its brief isn't settled.                                                   |
| G1, G2, G7, G8          | low    | 8000       | Short, structured output, or (G7) a learner waiting mid-activity.                                                                                                               |

Stay at 16k or below — the SDK refuses larger non-streaming requests, and the proxy still has a non-streaming path.

## Usage metering (default proxy mode)

- **Budget** (D14): a **per-device daily budget** in weighted tokens (output ×4 input; cached input ~free), sized for roughly **60 generations/day**. **Reserved headroom**: G6 and G7 draw from a protected slice, so an activity in progress can always finish. Tracked in `device_usage`; responses carry remaining-budget headers shown in Me → AI usage.
- **On exhaustion**: 429 + reset time → a calm "you've used today's included generation" state; existing content stays usable. A BYO key bypasses the meter.
- **Burst limits** (`BURST_LIMITS`): per-kind daily caps per device, plus 30/day across kinds for repairs, whose text the client supplies — so it's capped and no longer than a response of its kind.
- **Codes.** A code raises one device's daily ceiling — **a daily allowance, not a pool**, so no extra accounting — and scales its burst limits in proportion, or they'd bind first. Redeemable **once, by one device**; a reinstall means issuing another, cheaper than tying grants to accounts. It cannot lift `GLOBAL_DAILY_BUDGET_WEIGHTED`. The bonus rides back on `add_device_usage`'s return, keeping one round trip. Only an HMAC is stored (`budget_codes`), and every invalid code answers alike, so the route can't reveal which exist. Issue with `pnpm codes:new --label "beta: alex" --bonus 1000000 --days 30`; revoke in the Supabase SQL editor.
- **Reserve, then settle.** Before calling the model, `add_device_usage` counts the call and holds the template's `maxTokens` as output in one atomic step, checking limits against the state before the hold, so parallel requests see each other. The hold is swapped for the real count, which arrives only in the final `message_delta`. If the call ends sooner: **the proxy stopped it** — the client disconnected (the common case), a search failed, or a search hit its deadline → it charges what streamed, at `CHARS_PER_OUTPUT_TOKEN`, capped at the hold, since charging the hold overcharged ~3x; **the stream broke under us** → the hold stands, since a billed response may have been lost. An Anthropic error status returns the hold but still counts as a call.
- **A failed web search is neither retried nor repaired, and ends the call.** A rate-limited or used-up search returns 200 with an error inside `web_search_tool_result`; unexamined, it's billed as success and its narration triggers a repair into the same outage. Left to run, the model also keeps searching into the same error — one check ran 13 minutes and 36k output tokens that way. So the first error block stops the stream (`serverToolError`, in the proxy, the BYO-key client and the prompt scripts alike). The proxy settles it as `search:<code>` and answers `search_unavailable`, which the client treats as non-transient, skipping the repair for kinds with `tools.webSearch`. Those kinds run with `maxRetries: 0`, since default retries would bill three searches for one failure. Unchecked, one failure cost about a fifth of a device's daily budget.
- **`maxTokens` is not a ceiling for a tool-using kind; time is.** The search loop runs within one request and usage aggregates across turns, so G4 and G12 can exceed 16,000. Settlement stays correct; only the hold is weaker. What bounds them is `SEARCH_DEADLINE_MS` (240s): a searching call still running then is stopped, settled as `search:deadline` and answered `search_unavailable`. It sits under the route's 300-second `maxDuration`, which would otherwise kill the call mid-stream and leave it unsettled. At low effort a good G4 search has taken under two and a half minutes, so the deadline is a backstop, not a budget. Hidden thinking never streams as text, so a stopped call is undercharged; the deadline caps by how much.
- **One statement per counter.** Each limit is counted in one database operation — `add_device_usage` (tokens), `count_ip_action` (unsigned registrations), `count_device_action` (feedback, reports, account deletion, code redemption). Read-then-write lets parallel requests share a count, which is no limit at all — and for code redemption, the guard against sweeping the keyspace, that is the point. Failed attempts count.
- **Proxy-wide cap**: all devices stop at `GLOBAL_DAILY_BUDGET_WEIGHTED` per UTC day (default 20M, overridable with `AI_DAILY_LIMIT_WEIGHTED`), answering 429 `service_limit_reached`, shown like an exhausted budget.
- **Spend alerts**: the first call past 50%, 90% or 100% of that cap emails `alerts@thinkering.app` (Resend), once per level per day (`spend_alerts`), so no scheduled job is needed. Read or chart `spend_by_day` (`supabase/schema.sql`) in the Supabase dashboard.

## Untrusted text

Prompt injection can't be ruled out, so the pipeline is built so that it matters little: the proxy renders prompts from `{kind, params}` and is no general relay, the only tool is web search, every output crosses a Zod schema, and nothing crosses between learners. What's left is text from outside the app steering a generation, and a script sending more than any learner would.

- **Pages are fenced off.** Text from the web reaches a prompt inside a named tag, and the instructions say what's in it is material, never instructions: the fetched page in `resource.describe` (`<page>`), and a resource's page-drafted how-to-use and summary in `activity.generate` (`<resource_notes>`) — so an injection can't ride a saved summary into a later generation. `wrapUntrusted` (`prompts/untrusted.ts`) drops the text's own copies of the tag, so a page can't close the block early. The search kinds have no text to fence, since the tool results arrive inside the call; `RESOURCE_RULES` says the same about them in words.
- **Links are web pages.** A URL the model writes — `resourceEmbed.url`, a search result — must be `http(s)` (`webUrlSchema`); `z.string().url()` alone accepts `javascript:` and `data:`. The app checks again where a link is tapped (`openResource`), for rows that predate the schema or came through sync.
- **Params are bounded, by trimming.** Every string param has a ceiling (`packages/core/src/limits.ts`), including the whole interest context, which was unchecked: its budget drops whole trailing lines, but the profile lines are always kept. Past the ceiling a string is **trimmed, not refused**. The app enforces the learner's limit where they type (`TEXT_LIMITS`, below), and the server's is twice that, so the only text that meets it is a script's or one saved before the limits existed — and refusing that would break every generation for the learner who wrote it, where trimming only shortens what the model reads. Bodies over 1 MB are refused (413) before they're hashed or parsed.
- **The learner's limits are soft.** `TextField`'s `limit` shows a count from 90% of the limit, and past it the text stays and the screen holds back sending — Save, Continue, Ask — until it fits. A hard `maxLength` would cut a long paste without saying so. The limits are sized so that nobody writing in a phone field meets them: a line 200 characters, what you want to learn 500, a note 2,000, a reflection or an answer in an activity 5,000.

## Failure handling

- One automatic retry on transient failure; schema-invalid output gets one repair round-trip (validation errors sent back), then a "couldn't generate, try again" state. Never render unvalidated output. A document that fails validation is discarded whole, including pages already streamed.
- **Markdown fences**: models wrap JSON in ```json despite the contract (Haiku nearly always). `extractJsonText` strips it at the single parse boundary — cheaper than a repair.
- **Discriminator drift**: models write `"type"` for `"kind"` when the block format is only prose. `src/prompts/preamble.ts` spells out the discriminator with an example, and `activity.generate` pins the closing review/summary pair explicitly. Both are load-bearing; run `pnpm prompt:check activity.generate` after touching either.
- G6 not ready at the review page: a "one more look at your answers…" skeleton for up to ~5s, then a generic summary if the call failed.
- Aborted streams: mark `llm_calls.status = aborted`; keep the partial doc only if ≥1 valid page.

## Retired kinds

A `kind` is a wire contract. The proxy renders from **its own** registry, so a removed or renamed kind breaks every install that hasn't updated — and mobile bundles ship with no OTA. The rejection happens at `getPromptTemplate`, before the usage reservation, so it leaves no row in `device_usage`: the learner sees a failure and the server keeps no trace. (The `intake.topics` + `intake.success` → `intake.choices` merge broke intake this way.)

- **Retiring a kind keeps it registered for one release.** The template moves unchanged, version untouched, to `RETIRED_PROMPTS` in `src/prompts/registry.ts`, so old installs get what they were built against. It stays out of `PROMPTS`, which drives snapshots, input fixtures and the internal prompts page. Retired kinds need no recording: fixture mode never crosses the wire.
- **Delete the shims only once the builds that send them are gone** — the map entry and the template file.
- **The same applies to params.** A new required field in an existing kind's `paramsSchema` rejects old clients as `invalid_params`, just as invisibly.
- **`unknown_kind` is logged server-side** (`logAiCall`, `errorType: 'unknown_kind'`) and shown as "Update thinkering to keep going." — the one generation error retrying can never fix.

## Observability

- **Local**: `llm_calls` + the AI Inspector (prompt, response, tokens, latency, est. cost) — the primary prompt-iteration loop. One row per attempt, so a repair's failed attempt is counted too. Per-kind daily totals are in weighted tokens but are **a floor, not the meter**: aborted streams report no tokens while the proxy charges what streamed, so the panel shows how many calls it couldn't count.
- **Server**: per-kind counters (count, tokens, p50/p95 latency, error rate) — aggregate only, no prompt/response bodies (privacy).
- **PostHog**: `ai_call` with kind, model, latency bucket, ok/error, a coarse `error_type` (`invalid_output`, `search_failed`, `upstream`, `network`, `byok_auth`, …), whether the call was `retried` or `repaired`, and the `mode` — no content (`08`). A call a repair saved still reads `ok`, so `repaired` is the early warning that a prompt is drifting.

## Prompt authoring guidelines

- Templates are TS functions returning `{system, messages}` with typed params. Each has a `version` recorded in `llm_calls`.
- Pedagogy lives in one module (`src/prompts/pedagogy.ts`) so G1/G3/G5b stay consistent (retrieval practice, worked examples, spacing, interleaving, transfer, cognitive load, misconceptions).
- Generated content follows the app's tone: plain, warm, adult, concise; no filler praise. **Never patronize or assume**: app history isn't the user's whole knowledge, so avoid "you haven't learned X yet"; say "in thinkering you've covered…" and treat prior knowledge as plausible.
- Fixtures: each kind has input fixtures and output checked by schema, not string equality; `pnpm prompt:run <kind>` runs a kind for manual iteration.
