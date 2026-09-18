# 10 — Testing strategy

The goal is a small suite that runs in seconds, guards the things that are expensive or impossible to fix later, and gives an agent session an unambiguous definition of "done".

## The gate

`pnpm verify` = `typecheck` + `lint` + `test` — vitest in core, db and web routes; jest (`jest-expo`) in `apps/mobile`. Target **under 60 seconds**. Every session runs it before claiming a work package complete; CI runs it on every PR. If a WP's acceptance criteria name a test, that test is part of the gate for that WP.

Nothing in the gate touches the network, a model, a simulator, or a real Supabase project.

### The inner loop

The gate is for the end of a work package. While working, run only what you're
changing — `pnpm --filter @thinkering/core test src/scheduler` is sub-second
against `pnpm verify`'s ~20, and every package has a `test:watch`.

Two things exist to keep that loop honest. Coverage is **off locally and on in
CI** (`packages/core/vitest.config.ts` keys off `process.env.CI`): the
thresholds are global, so with coverage always on, a focused run reports ~20%
and exits non-zero with nothing wrong — the fastest command in the repo looking
like a failing test. `pnpm --filter @thinkering/core test:cov` turns it on by
hand. And turbo's cache is content-addressed and lives in the repo root's
`.turbo/cache`, shared across git worktrees, so a run in one Conductor
workspace warms every other one.

### What a change needs

| You changed                                 | Write                                          | Check before done                                               |
| ------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Scheduler, schemas, other `packages/core`   | Table-driven vitest cases (Tier 1)             | The package's tests, then `pnpm verify`                         |
| The database schema                         | Migration + snapshot (Tier 2)                  | `packages/db` tests, then `pnpm verify`                         |
| An `/api` route                             | A handler test (Tier 3)                        | `apps/web` tests, then `pnpm verify`                            |
| A block type or the activity player         | One behavioral test (Tier 4)                   | `apps/mobile` tests, then `pnpm verify`                         |
| A prompt template                           | The updated snapshot (Tier 5)                  | `pnpm prompt:check <kind>` (live — ask first), the AI Inspector |
| A screen's layout, copy, or styling         | Nothing                                        | Look at it: run the app and seed it (Tier 6)                    |
| Web startup, storage, or the SQLite worker  | A browser spec if it's a new way to break      | `pnpm --filter @thinkering/mobile test:web`                     |
| A Maestro flow, or cutting a release        | —                                              | `pnpm e2e`, and `RELEASING.md`                                  |

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
- **Determinism**: core takes `now()` and `newId()` from an injected context. `Date.now()`, `Math.random()`, and direct UUID generation are lint-banned inside `packages/core` — this is what keeps scheduler tests from flaking.
- **Zod schemas**: valid fixtures parse, and broken model output never gets through. Every kind's recording is cut off at several points and must be rejected, as must an empty object (`src/fixtures/recorded.test.ts`) — which catches a schema loose enough to accept a fragment. The Activity Document, the most complex output and the one rendered page by page, also keeps a committed corpus (`fixtures/malformed/activity-doc`: truncated JSON, missing review page, two review pages, unknown block kind, non-interactive content page, concept ids that don't exist on the goal) that must fail with a useful error. When a real bad response turns up — in the AI Inspector, say — add it to its kind's corpus.
- **Prompt assembly**: snapshot the rendered `{system, messages}` per kind. Prompts are the artifact, so string snapshots are correct here — the diff is the review. Assert the cache breakpoint sits after the shared preamble; a moved breakpoint silently doubles cost.
- **Context assembly**: token budget respected, ordering stable across runs (prompt-cache safety), truncation deterministic.
- **Feedback helpers**: context sanitization and Featurebase URL construction are unit-tested without network access; only coarse screen, platform, and app version can survive the allowlist.
- **Library definitions** (`06`): every item has a valid page skeleton, an `outcomeLabel`, and a unique id.

Coverage threshold: 90% on `scheduler/` and `schemas/`, enforced in CI. No thresholds anywhere else.

### Tier 2 — `packages/db`

This is the irreversible surface: an applied migration can't be edited (see AGENTS.md) and users have data on disk.

- **Migration chain**: empty → head applies cleanly; and every committed historical snapshot (`fixtures/db/v<N>.sql`, dumped when a migration ships) migrates forward to head with its rows intact. A copy-migrate-swap migration gets its own data-preservation test (D17).
- **Additive-first check**: a test fails on any column drop or retype that isn't in an explicit, commented allowlist.
- **Repositories**: soft-deleted rows never come back from a query; every write bumps `updated_at`.
- **Sync merge**: the LWW resolver lives as a pure function in `packages/core` so conflicts are unit-testable without a server — concurrent edits, tombstone vs. update, exact ties, clock skew (`src/sync/merge.test.ts`). The SQLite side (`packages/db/test/sync.test.ts`) covers what the resolver can't see: first sync vs. nothing-changed, a batch refused because a row came from a newer schema, and a row this build can't parse being skipped rather than wedging the sync.
- **Export/import**: round-trip (export → wipe → import) is deep-equal; import replaces rather than merges; an import file newer than the app — in either version — is refused; an older one migrates forward on the row schemas' defaults.
- **Live sync** is the one thing no unit test can reach, so it is a script rather than a test: `pnpm sync:check` runs two simulated devices through a real Supabase project — first sync, second-device pull, concurrent-edit LWW, tombstone travel, RLS isolation, the `schema_version` floor, and the off-switch deletion. It creates and deletes its own throwaway users. Run it against a project before a release; never from `pnpm verify`, which must stay offline.

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

Quality judgment stays human: eyeball the output in the AI Inspector, and write the verdict in the PR description — what was checked, what's good, what's still off — so the assessment travels with the change it judges and a later session can find it (`gh pr view`).

### Tier 6 — E2E

**Not an iteration tool.** A Maestro run needs a booted simulator, an install,
and Metro in fixture mode; it takes minutes; and by design it asserts nothing
about screen layout, which is what most iOS changes touch. Running it after an
iOS edit is the most expensive way to learn the least. To _see_ a change, run
the app (`.conductor/run-ios.sh`) and seed it: `pnpm seed:sim` deep-links
`thinkering://dev/seed`, which writes the fixture interest, a path, a week of
history, and today's cards with their documents attached, then lands on Today.
`pnpm seed:sim --fresh` clears everything first (`dev/reset?seed=1`), and
`pnpm reset:sim` leaves the app empty on the intake welcome (`dev/reset`); on
web the same paths are URLs. Those routes, and Me → Developer, exist only with
`DEV_TOOLS` — a dev build, a fixture-mode build, or `EXPO_PUBLIC_DEV_TOOLS=true`,
all fixed at bundle time (`02` §Dev experience). Reach for `pnpm e2e` when the
task is a release, or when the change _is_ to a flow.

#### Driving the simulator: semantic selectors first

Use a known `testID` or stable visible text directly. When the selector is
unknown or an interaction fails, `pnpm ui:tree` prints every addressable element
on the current screen with its `testID`, text, and bounds:

```
testID                      text                                     bounds
activity-card-next-0        Family words and mein/dein. Greet some…   [17,181][269,340]
activity-card-strengthen-0  Ordering practice: hätte gern drills. …   [17,409][269,568]
activity-card-strengthen-1  Quick retrieval: greetings and introdu…   [280,409][532,568]
tab-path                    Path, tab, 2 of 4                        [100,791][201,840]
```

The tree distinguishes a bad selector from a stale bundle or a control that is
not in the accessibility hierarchy. Use text for stable, user-visible controls;
use a `testID` for dynamic content, icons, localization-sensitive copy, or an
element a committed flow must keep addressing across copy changes. `testID`
remains optional on shared components so exploratory testing does not create an
identifier-maintenance obligation across the whole UI.

Maestro treats text and ids as full-match regular expressions. For example,
`assertVisible: 'Greet someone'` does not match "Greet someone at a Munich
dinner — Not started"; use the exact label, `.*` deliberately, or a stable id.
An `ActivityCard` exposes its title, goal line, and status as one accessibility
label, so its flow uses `activity-card-${section}-${index}`. If several elements
legitimately share a selector, Maestro's zero-based `index` can disambiguate;
`ui:tree` reports repeated ids so the choice is explicit.

Committed flows never tap raw screen coordinates: those are device- and
layout-dependent. A coordinate is acceptable only as an ad-hoc last resort for
something outside the app's accessibility tree, not as a reason to add handles
throughout unrelated application code.

`maestro hierarchy` restarts the XCUITest driver on each invocation (~40–60s per
call). For repeated inspection, the optional Maestro MCP server holds a session
open: use `inspect_screen` for the tree and `take_screenshot` for the image.
Claude Code reads `.mcp.json`; Codex reads `.codex/config.toml` after the
repository is trusted. Both need Maestro and a JDK on the local machine; set
`MAESTRO_BIN` / `MAESTRO_JAVA_HOME` if yours live elsewhere. Nothing in
`pnpm verify` depends on them. Avoid Maestro's deprecated `query` subcommand.

#### Maestro flows

Three Maestro flows on the iOS simulator, run before a release, not per PR: intake → a path exists; Today → complete an activity → history entry and goal status advanced; export → import. They live in `apps/mobile/.maestro` with a README, run with `pnpm e2e`, and share one install — flow 1 leaves the interest that flows 2 and 3 use. They run in **fixture AI mode**, so they're deterministic and free.

Two things about them are worth knowing before editing one (selectors are covered above):

- **Maestro's text matching is a full-match regex**, so a substring needs `.*`. That bites on anything with an `accessibilityLabel`: a `Pressable` with one is a single accessibility element, and the `Text` nodes inside it are invisible to the driver. `'Done today'` inside an activity card can only be matched through the card's own label.
- **What the system hides.** `UIActivityViewController`'s contents live in another process, so the export flow asserts that the app reached the sheet and came back, not what the sheet said. The file round trip is a `packages/db` test.

Running them via **Expo Go** (rather than the `e2e` EAS build) needs the Metro URL, because clearing Expo Go's state also clears which project it had open, and the first launch shows a developer-menu tour over the app. `helpers/open-app.yaml` handles both.

#### Browser tests

The browser tier is `pnpm --filter @thinkering/mobile test:web`: it exports the
production web app in fixture mode, serves it with the headers from
`vercel.json`, and drives a fresh install through intake and through a backup
restore. Re-entering `/` must land on Today, proving that the SQLite worker
started, migrations ran, an Interest was written, and browser-local data
persisted. The tier stays deliberately small — `web-intake.spec.ts` and
`web-smoke.spec.ts` are the two ways a person's data gets created, and component
behavior remains covered at the cheaper tiers above. The backup fixture carries
a deliberately long `approachNotes` — expo-sqlite's web worker returns a
synchronous result through a shared buffer and wrote the payload length one byte
wide, so anything from 256 bytes up came back truncated
(`patches/expo-sqlite@57.0.3.patch`). A short fixture row reads back fine either
way, so the spec asserts the length rather than trusting it.

Every spec runs on both Chrome and mobile WebKit. WebKit is where the worker,
OPFS and SharedArrayBuffer behavior diverges from Chromium, and a divergence
there takes the whole app down instead of degrading it — `web-sqlite-worker.spec.ts`
covers the two that already have: the worker outliving the blob URL it was
started from (`patches/expo@57.0.22.patch`), and a second tab being told what to
do about a database it can't open. Both engines run against a profile on disk
(`e2e/fixtures/persistent-context.ts`), because OPFS needs real storage behind it
and WebKit refuses it outright in an ephemeral context.

That fixture also collects the page's console errors, and on failure records the
URL, those errors and the rendered text — as a test attachment and on stdout,
since the reason a browser test fails on CI's engine and nowhere else is rarely
in the assertion that timed out. CI keeps the traces for a week when the run
fails. What that turned up the first time was `Sync operation timeout` from
expo-sqlite's synchronous worker bridge, which reproduces on neither engine
locally (`docs/02`).

#### CI

CI runs the gate, the browser tests, and the landing build as three parallel
jobs, so the slowest one sets the wall clock rather than the sum. The gate job
restores `.turbo` from any earlier run's cache, which is what keeps a one-package
PR from paying for the whole monorepo.

#### Manual pre-release checks

The feedback integration also gets a manual pre-TestFlight pass: both chooser paths; all three Featurebase boards; guest participation; anonymized public author display; hidden leaderboard; post/comment moderation; public Feature requests and General feedback and discussions; author-only Bugs and issues; filtering, user reporting, blocking, and contact mechanisms required by [App Review Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/); WebView loading/offline/retry/back/close/external-link behavior; Expo web's new-tab fallback; private email validation, context preview/toggle, success, and retry-preserved text. If end-user reporting is unavailable, set `EXPO_PUBLIC_FEATUREBASE_IN_BROWSER=true` and verify that iOS opens the portal in the system browser instead of the WebView.

## Fixture AI mode

A third AI mode alongside proxy and BYO key (`02`): `fixture` serves recorded responses from disk with simulated streaming and latency. It is a first-class app mode, built in WP2.3 — not a test-only shim — and the default for dev builds and the run scripts; `AI_MODE=proxy` opts into real calls.

It's the single biggest accelerator here: the entire app runs deterministically, offline, and at zero token cost, which is what makes E2E possible, makes UI sessions fast, and lets someone new run the app without an API key.

## What not to write

Agent sessions tend to over-produce tests. Don't add: tests that only restate a Zod schema or type, tests for getters and trivial mappers, UI snapshots, mock-heavy tests that assert a mock was called, or a second test that exercises the same branch as an existing one. A test that can't fail for a real reason is a maintenance cost with no payoff.
