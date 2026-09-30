# 10 — Testing strategy

A small suite that runs in seconds, guards what is expensive or impossible to fix later, and gives an unambiguous definition of "done".

## The gate

`pnpm verify` = `typecheck` + `lint` + `test` — vitest in core, db and web routes; jest (`jest-expo`) in `apps/mobile`. Target **under 60 seconds**. Run it before calling work done; CI runs it on every PR. Nothing in it touches the network, a model, a simulator, or a real Supabase project.

### The inner loop

While working, run only what you're changing — `pnpm --filter @thinkering/core test src/scheduler` is sub-second against `pnpm verify`'s ~20 — or a package's `test:watch`. Coverage is **off locally and on in CI** (`packages/core/vitest.config.ts` keys off `process.env.CI`): the thresholds are global, so a focused run with coverage would report ~20% and fail with nothing wrong. `test:cov` turns it on by hand. Turbo's cache (`.turbo/cache` in the repo root) is shared across git worktrees.

### What a change needs

| You changed                                | Write                                     | Check before done                                               |
| ------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------- |
| Scheduler, schemas, other `packages/core`  | Table-driven vitest cases (Tier 1)        | The package's tests, then `pnpm verify`                         |
| The database schema                        | Migration + snapshot (Tier 2)             | `packages/db` tests, then `pnpm verify`                         |
| An `/api` route                            | A handler test (Tier 3)                   | `apps/web` tests, then `pnpm verify`                            |
| A block type or the activity player        | One behavioral test (Tier 4)              | `apps/mobile` tests, then `pnpm verify`                         |
| A prompt template                          | The updated snapshot (Tier 5)             | `pnpm prompt:check <kind>` (live — ask first), the AI Inspector |
| A screen's layout, copy, or styling        | Nothing                                   | Look at it: run the app and seed it (Tier 6)                    |
| Web startup, storage, or the SQLite worker | A browser spec if it's a new way to break | `pnpm --filter @thinkering/mobile test:web`                     |
| A Maestro flow, or cutting a release       | —                                         | `pnpm e2e`, and `RELEASING.md`                                  |

## Where the effort goes

| Tier | Surface                                                                 | Tool                              | Share of effort     |
| ---- | ----------------------------------------------------------------------- | --------------------------------- | ------------------- |
| 1    | `packages/core` — scheduler, schemas, prompt assembly, context, library | vitest                            | ~45%                |
| 2    | `packages/db` — migrations, repositories, sync merge, export/import     | vitest + better-sqlite3           | ~25%                |
| 3    | `apps/web/app/api` — validation, device auth, metering                  | vitest (handlers called directly) | ~15%                |
| 4    | Activity renderer + a few app behaviors                                 | React Native Testing Library      | ~10%                |
| 5    | Prompt/LLM quality                                                      | `pnpm prompt:check`, AI Inspector | manual loop, not CI |
| 6    | E2E on iOS sim + web startup/data smoke                                 | Maestro + Playwright              | pre-release + CI    |

### Tier 1 — `packages/core`

- **Scheduler** (D7): table-driven cases for Today selection per section, fallback chains, section completion, `not_started` counts driving the reflect card, and day boundaries (D12) across timezones and a DST transition.
- **Determinism**: `now()` and `newId()` come from an injected context; `Date.now()`, `Math.random()` and direct UUID generation are lint-banned in core.
- **Zod schemas**: broken model output never gets through. Every kind's recording, cut off at several points, must be rejected, as must an empty object (`src/fixtures/recorded.test.ts`). The Activity Document also has a committed corpus (`fixtures/malformed/activity-doc`) that must fail with a useful error. Add real bad responses to their kind's corpus.
- **Prompt assembly**: snapshot the rendered `{system, messages}` per kind — the diff is the review. Assert the cache breakpoint sits after the shared preamble; a moved breakpoint silently doubles cost.
- **Context assembly**: token budget respected, ordering stable across runs (prompt-cache safety), truncation deterministic.
- **Feedback helpers**: context sanitization and Featurebase URL construction; only coarse screen, platform and app version survive the allowlist.
- **Library definitions** (`06`): every item has a valid page skeleton, an `outcomeLabel`, and a unique id.

Coverage threshold: 90% on `scheduler/` and `schemas/`, enforced in CI. No thresholds anywhere else.

### Tier 2 — `packages/db`

The irreversible surface: users have data on disk.

- **Migration chain**: empty → head applies cleanly, and every snapshot in `fixtures/db/v<N>.sql` migrates to head with its rows intact. A copy-migrate-swap migration gets its own data-preservation test (D17).
- **Additive-first check**: any column drop or retype not in the commented allowlist fails.
- **Repositories**: soft-deleted rows never come back from a query; every write bumps `updated_at`.
- **Sync merge**: the LWW resolver is a pure function in core (`src/sync/merge.test.ts`) — concurrent edits, tombstone vs. update, exact ties, clock skew. `packages/db/test/sync.test.ts` covers first sync vs. nothing-changed, a batch refused for a newer-schema row, and an unparseable row skipped rather than wedging the sync.
- **Export/import**: export → wipe → import is deep-equal; import replaces rather than merges; a newer file is refused; an older one migrates forward.
- **Live sync** is a script, not a test: `pnpm sync:check` runs two simulated devices through a real Supabase project — first sync, second-device pull, concurrent-edit LWW, tombstone travel, RLS isolation, the `schema_version` floor, and the off-switch deletion — with throwaway users it creates and deletes. Run it before a release, never from `pnpm verify`.

### Tier 3 — `apps/web/app/api`

Route handlers are called directly with a `Request`; the Anthropic SDK is mocked.

- Bad input → 400 from Zod, never a 500.
- Device auth (D10): bad signature, stale timestamp, and replayed request are rejected.
- Metering (D14): budget exhaustion returns 429 with a reset time; reserved headroom still admits `activity.review` and `activity.question`.
- The server never logs prompt or response bodies — assert what the logger receives.
- **Feedback routes** (`/api/feedback`, `/api/activity-report`): signed auth, malformed requests, optional email/context, Reply-To, size limits, UTC-day rate limits, provider failures, content-free logging.

### Tier 4 — renderer and app

- One behavioral test per block kind, from the ActivityDoc fixtures: it renders, accepts interaction, and hands the player's sink the exact `responses` payload. Writing the row is a `packages/db` test.
- Harness: `jest-expo` + React Native Testing Library. RNTL 14's `render` and `fireEvent` are **async** — `await` them. Rendering repeatedly in one test (a loop with `unmount()`) trips "overlapping act()" and silently renders nothing; use `it.each`.
- Unknown block kind renders the placeholder without taking down the page (`05`).
- Resume restores `current_page`; a partial streamed doc with one valid page renders.

Not tested, on purpose: screen layout, styling, navigation chrome, component snapshots.

### Tier 5 — prompt and LLM quality

CI never calls a model.

- **Recorded fixtures**: `pnpm prompt:run <kind> --record` saves a real response into `fixtures/recorded/<kind>/`, which tests and fixture mode replay. Re-record deliberately.
- **`pnpm prompt:check <kind>`** runs live and asserts _structure_, never string equality — schema valid, page count in range for `estMinutes`, one review page second-to-last, every non-summary page interactive, concepts resolve to the goal's, and tone lints (`04`). Run it on any prompt change.

Quality judgment stays human: read the output in the AI Inspector and put the verdict in the PR description.

### Tier 6 — E2E

**Not an iteration tool.** Maestro needs a booted simulator, an install and Metro, takes minutes, and asserts nothing about layout. To _see_ a change, run the app and seed it (AGENTS.md §Running the app). The seed routes and Me → Developer exist only with `DEV_TOOLS` — a dev build, a fixture-mode build, or `EXPO_PUBLIC_DEV_TOOLS=true`, fixed at bundle time (`02` §Dev experience).

#### Driving the simulator

Use a known `testID` or stable text. When one fails, `pnpm ui:tree` shows whether the selector, the bundle or the accessibility hierarchy is at fault:

```
testID                      text                                     bounds
activity-card-next-0        Family words and mein/dein. Greet some…   [17,181][269,340]
```

Text suits stable controls; a `testID` suits dynamic content, icons, and anything a flow must survive copy changes. Maestro matches text and ids as **full-match regexes**, so a substring needs `.*`, and a `Pressable` with an `accessibilityLabel` hides its inner `Text` — hence `activity-card-${section}-${index}`. Committed flows never tap coordinates. `maestro hierarchy` takes ~40–60s per call; the optional Maestro MCP server (`.mcp.json`, `.codex/config.toml`; `MAESTRO_BIN` / `MAESTRO_JAVA_HOME`) keeps a session open. Avoid the deprecated `query` subcommand.

#### Maestro flows

Three flows, run before a release: intake → a path exists; Today → complete an activity → history and goal status advanced; export → import. They live in `apps/mobile/.maestro` (with a README), run with `pnpm e2e` in fixture AI mode, and share one install — flow 1 leaves the interest the others use. The share sheet is another process, so the export flow asserts only that the app reached it and came back. Under Expo Go, `helpers/open-app.yaml` reopens the project and skips the developer-menu tour.

#### Browser tests

`pnpm --filter @thinkering/mobile test:web` serves the fixture-mode web export with `vercel.json`'s rules and drives a fresh install through intake (straight through, and reloaded partway) and a backup restore (`web-intake.spec.ts`, `web-smoke.spec.ts`). Landing on Today proves the SQLite worker, migrations and browser storage work. The backup fixture's long `approachNotes` guards `patches/expo-sqlite@57.0.3.patch`, which fixed truncation of values over 255 bytes.

Every spec runs on Chrome and mobile WebKit, where worker, OPFS and SharedArrayBuffer behavior diverges and takes the whole app down; `web-sqlite-worker.spec.ts` covers the known cases. Both use an on-disk profile (`e2e/fixtures/persistent-context.ts`) because WebKit refuses OPFS in an ephemeral context. On failure the fixture records the URL, console errors and page text; CI keeps traces for a week.

#### CI

The gate, the browser tests and the landing build run as three parallel jobs. The gate job restores `.turbo` from earlier runs.

#### Manual pre-release checks

Before TestFlight, the feedback integration gets a manual pass:

- Both chooser paths.
- All three Featurebase boards: public Feature requests and General feedback and discussions; author-only Bugs and issues.
- Guest participation, anonymized public author display, hidden leaderboard.
- Post and comment moderation.
- Filtering, user reporting, blocking, and contact mechanisms required by [App Review Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/).
- WebView loading, offline, retry, back, close, and external-link behavior; Expo web's new-tab fallback.
- Private email validation, context preview and toggle, success, and retry-preserved text.
- If end-user reporting is unavailable, set `EXPO_PUBLIC_FEATUREBASE_IN_BROWSER=true` and verify that iOS opens the portal in the system browser instead of the WebView.

## Fixture AI mode

A third AI mode alongside proxy and BYO key (`02`): `fixture` serves recorded responses from disk with simulated streaming and latency. It is a first-class app mode, not a test-only shim, and the default for dev builds and the run scripts; `AI_MODE=proxy` opts into real calls. The whole app runs deterministically, offline, at zero token cost — which makes E2E possible and lets someone new run the app without an API key.

## What not to write

Agent sessions tend to over-produce tests. Don't add: tests that only restate a Zod schema or type, tests for getters and trivial mappers, UI snapshots, mock-heavy tests that assert a mock was called, or a second test that exercises the same branch as an existing one. A test that can't fail for a real reason is a maintenance cost with no payoff.
