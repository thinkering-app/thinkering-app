# 10 — Testing strategy

The goal is a small suite that runs in seconds, guards the things that are expensive or impossible to fix later, and gives an agent session an unambiguous definition of "done". Everything else is deliberately untested.

## The gate

`pnpm verify` = `typecheck` + `lint` + `vitest run` (core, db, web routes). Target **under 60 seconds**. Every session runs it before claiming a work package complete; CI runs it on every PR. If a WP's acceptance criteria name a test, that test is part of the gate for that WP.

Nothing in the gate touches the network, a model, a simulator, or a real Supabase project.

## Where the effort goes

| Tier | Surface                                                                 | Tool                              | Share of effort      |
| ---- | ----------------------------------------------------------------------- | --------------------------------- | -------------------- |
| 1    | `packages/core` — scheduler, schemas, prompt assembly, context, library | vitest                            | ~45%                 |
| 2    | `packages/db` — migrations, repositories, sync merge, export/import     | vitest + better-sqlite3           | ~25%                 |
| 3    | `apps/web/app/api` — validation, device auth, metering                  | vitest (handlers called directly) | ~15%                 |
| 4    | Activity renderer + a few app behaviors                                 | React Native Testing Library      | ~10%                 |
| 5    | Prompt/LLM quality                                                      | `pnpm prompt:check`, AI Inspector | manual loop, not CI  |
| 6    | E2E on iOS sim                                                          | Maestro                           | 3 flows, pre-release |

### Tier 1 — `packages/core`

- **Scheduler** (D7): table-driven cases for Today selection per section, fallback chains, section completion, `not_started` counts driving the reflect card, and day boundaries (D12) across timezones and a DST transition.
- **Determinism**: core takes `now()` and `newId()` from an injected context. `Date.now()`, `Math.random()`, and direct UUID generation are lint-banned inside `packages/core` — this is what keeps scheduler tests from flaking.
- **Zod schemas**: valid fixtures parse; a committed corpus of _broken_ model output (truncated JSON, missing review page, two review pages, unknown block kind, non-interactive content page, concept ids that don't exist on the goal) fails with a useful error and never reaches a renderer.
- **Prompt assembly**: snapshot the rendered `{system, messages}` per kind. Prompts are the artifact, so string snapshots are correct here — the diff is the review. Assert the cache breakpoint sits after the shared preamble; a moved breakpoint silently doubles cost.
- **Context assembly**: token budget respected, ordering stable across runs (prompt-cache safety), truncation deterministic.
- **Feedback helpers**: context sanitization and Featurebase URL construction are unit-tested without network access; only coarse screen, platform, and app version can survive the allowlist.
- **Library definitions** (`06`): every item has a valid page skeleton, an `outcomeLabel`, and a unique id.

Coverage threshold: 90% on `scheduler/` and `schemas/`. No thresholds anywhere else.

### Tier 2 — `packages/db`

This is the irreversible surface: an applied migration can't be edited (see CLAUDE.md) and users have data on disk.

- **Migration chain**: empty → head applies cleanly; and every committed historical snapshot (`fixtures/db/v<N>.sql`, dumped when a migration ships) migrates forward to head with its rows intact. A copy-migrate-swap migration gets its own data-preservation test (D17).
- **Additive-first check**: a test fails on any column drop or retype that isn't in an explicit, commented allowlist.
- **Repositories**: soft-deleted rows never come back from a query; every write bumps `updated_at`.
- **Sync merge**: the LWW resolver lives as a pure function in `packages/core` so conflicts are unit-testable without a server — concurrent edits, tombstone vs. update, exact ties, clock skew (`src/sync/merge.test.ts`). The SQLite side (`packages/db/test/sync.test.ts`) covers what the resolver can't see: first sync vs. nothing-changed, a batch refused because a row came from a newer schema, and a row this build can't parse being skipped rather than wedging the sync.
- **Export/import**: round-trip (export → wipe → import) is deep-equal; import replaces rather than merges; an import file newer than the app — in either version — is refused; an older one migrates forward on the row schemas' defaults.

### Tier 3 — `apps/web/app/api`

Route handlers are called directly with a `Request`; the Anthropic SDK is mocked.

- Bad input → 400 from Zod, never a 500.
- Device auth (D10): bad signature, stale timestamp, and replayed request are all rejected.
- Metering (D14): budget exhaustion returns 429 with a reset time; reserved headroom still admits `activity.review` and `activity.question` when generation kinds are capped.
- The server never logs prompt or response bodies — assert the shape of what the logger receives.
- **Feedback routes**: cover signed authentication, malformed requests, optional email/context, Reply-To behavior, the 4,000-character message and 80 KB report limits, persistent UTC-day rate limits, provider failures, and content-free logging for both `/api/feedback` and `/api/activity-report`.

### Tier 4 — renderer and app

- One behavioral test per block kind, driven by the same ActivityDoc fixtures used in development: it renders, accepts interaction, and records the exact payload the `responses` row will carry. Blocks write through a sink the player supplies, so the assertion is on the payload, not on SQLite — the row-writing itself is a `packages/db` test.
- Harness: `jest-expo` + React Native Testing Library in `apps/mobile` (`pnpm test`). RNTL 14's `render` and `fireEvent` are **async** — `await` them. Rendering repeatedly inside one test (a loop with `unmount()`) trips "overlapping act()" and silently renders nothing; use `it.each` instead.
- Unknown block kind renders the placeholder and doesn't take down the page (`05`).
- Resume restores `current_page`; a partial streamed doc with one valid page renders.

Not tested, on purpose: screen layout, styling, navigation chrome, snapshot tests of components. They cost more to maintain than the bugs they catch, and design is still moving.

### Tier 5 — prompt and LLM quality

CI never calls a model. Two separate things:

- **Recorded fixtures**: `pnpm prompt:run <kind> --record` saves a real response into `fixtures/recorded/<kind>/`. Tests and fixture mode replay those. Re-record deliberately; the diff is reviewable.
- **`pnpm prompt:check <kind>`**: runs live against N fixture inputs and asserts _structure_, never string equality — schema valid, page count in range for `estMinutes`, exactly one review page second-to-last, every non-summary page interactive, declared concepts resolve to real goal concepts, and tone lints (no "Great job!", no "you haven't learned X yet" per `04`). Run it on any prompt change; its cost is a handful of calls.

Quality judgment stays human: eyeball the output in the AI Inspector, and record the verdict next to the fixture so the assessment isn't lost between sessions.

### Tier 6 — E2E

Three Maestro flows on the iOS simulator, run before a release, not per PR: intake → a path exists; Today → complete an activity → history entry and goal status advanced; export → import. They run in **fixture AI mode**, so they're deterministic and free.

The feedback integration also gets a manual pre-TestFlight pass: both chooser paths; all three Featurebase boards; guest participation; anonymized public author display; hidden leaderboard; post/comment moderation; public Feature requests and General feedback and discussions; author-only Bugs and issues; filtering, user reporting, blocking, and contact mechanisms required by [App Review Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/); WebView loading/offline/retry/back/close/external-link behavior; Expo web's new-tab fallback; private email validation, context preview/toggle, success, and retry-preserved text. If end-user reporting is unavailable, verify that iOS uses the system browser fallback.

## Fixture AI mode

A third AI mode alongside proxy and BYO key (`02`): `fixture` serves recorded responses from disk with simulated streaming and latency. It is a first-class app mode, built in WP2.3 — not a test-only shim.

It's the single biggest accelerator here: the entire app runs deterministically, offline, and at zero token cost, which is what makes E2E possible, makes UI sessions fast, and lets someone new run the app without an API key.

## What not to write

Agent sessions tend to over-produce tests. Don't add: tests that only restate a Zod schema or type, tests for getters and trivial mappers, UI snapshots, mock-heavy tests that assert a mock was called, or a second test that exercises the same branch as an existing one. A test that can't fail for a real reason is a maintenance cost with no payoff.
