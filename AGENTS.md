# AGENTS.md — guidance for agent sessions

thinkering is a local-first mobile learning app for adults. This is a production codebase intended for long-term maintenance and open-source collaboration — favor boring, well-factored solutions over clever ones.

This file is read by Codex directly and by Claude Code through `CLAUDE.md`. Edit this one.

## Start here

1. Read `docs/00-overview.md` for vocabulary and the decision log. Use the canonical vocabulary (Interest, Goal, Activity, Section, Library item, "Put to use") in code and copy.
2. Your task is a GitHub issue (`gh issue view <n>`) or the prompt you were given. `docs/09-roadmap.md` is the build history: M0–M9 are done, with deviations recorded, and its "Later" list is the backlog. It holds no open work packages.
3. The relevant deep-dive doc is authoritative: `03` data model, `04` AI pipeline, `05` activity format, `06` library, `07` design system, `08` analytics and privacy. If you must deviate, update the doc in the same PR and say why.

The app is feature-complete for a first beta and heading to TestFlight; what's left is in `RELEASING.md`.

## Repo map

- `apps/mobile` — Expo app (expo-router, TypeScript strict, NativeWind). Routes in `src/app`, shared components in `src/components`, the activity player in `src/features`, the AI client and mode settings in `src/ai`, tokens in `src/theme/tokens.ts`.
- `apps/web` — Next.js landing page, the `/api` routes (AI proxy, device auth, metering, feedback), and the password-gated reference pages at `/internal` (prompts, activity library — `docs/02` §Internal pages). Server code in `lib/server`, Supabase schema in `supabase/schema.sql`.
- `packages/core` — pure TS, no React: domain types, Zod schemas (`src/schemas`), prompt templates (`src/prompts`), scheduler (`src/scheduler`), library definitions (`src/library`). Recorded and malformed model output in `fixtures/`.
- `packages/db` — Drizzle schema (`src/schema.ts`), migrations, repositories (`src/repos`), export and sync (`src/backup`).
- `packages/config` — shared Tailwind preset (the design tokens), tsconfig, eslint.

## Hard rules

- **Local-first**: user learning data is written to local SQLite only. Nothing user-generated leaves the device except (a) LLM calls through the proxy, (b) opt-in Supabase backup, (c) opt-in anonymous PostHog events per the schema in `docs/08`, (d) explicitly user-shared activity reports (`docs/08`).
- **No secrets in the client.** The Anthropic key lives only in `apps/web` API routes. The only client-side key is a user's own BYO Anthropic key in SecureStore.
- **All LLM output crosses a Zod boundary.** Never render or store unvalidated model output. Schemas live in `packages/core`.
- **Prompts are code.** Every prompt is a versioned template in `packages/core/src/prompts` with a `kind` id; every call is logged to the local `llm_calls` table so the AI Inspector can show it. No inline ad-hoc prompts.
- **Minimal user-facing text.** No excessive helper paragraphs, no onboarding tooltips, no exclamation-mark cheerleading. If a screen needs explaining, consider redesigning the screen. Copy is sentence case, short, warm but plain.
- **Deterministic scheduling.** Which activities appear on Today is decided by plain code in `packages/core/src/scheduler`, from what's in the database: the same data on the same day always gives the same Today. The model writes activities; it never picks them. For the same reason, code in `packages/core` receives the time and new IDs (`now()`, `newId()`) instead of calling `Date.now()` or `Math.random()` — lint blocks both — so a test can fix the clock.

## Commands

| Command | What it's for |
| --- | --- |
| `pnpm verify` | The gate: typecheck + lint + tests (vitest in core, db, web; jest in mobile). Offline, under a minute. Run before calling work done. |
| `pnpm --filter @thinkering/core test src/scheduler` | The inner loop — run only what you're changing. Every package has `test:watch`. |
| `pnpm --filter @thinkering/mobile test blocks` | Mobile's jest tests, filtered. |
| `pnpm --filter @thinkering/core test:cov` | Coverage by hand. It's off locally and enforced in CI. |
| `pnpm --filter @thinkering/db generate` | Generate a migration from `src/schema.ts`. |
| `pnpm --filter @thinkering/db snapshot` | Dump `fixtures/db/v<N>.sql` after adding a migration. |
| `pnpm prompt:check <kind>` / `pnpm prompt:run <kind> [--record]` | **Live model calls.** They read `ANTHROPIC_API_KEY` from `apps/web/.env` (or your shell) and cost money. Ask before running them. Each runs every input fixture for the kind; `--only <fixture>` runs one. |
| `pnpm format` | Prettier. |

`--filter <package>` runs a script in one workspace package instead of all of them. The names are in each `package.json`: `@thinkering/core`, `@thinkering/db`, `@thinkering/mobile`, `@thinkering/web`. Words after the script name go to the test runner, which treats them as a file filter.

Don't run `pnpm e2e` while iterating. The Maestro flows are a pre-release check (`docs/10` Tier 6) that take minutes and cover no screen layout. Run them only when the task is a release or the change is to `.maestro` itself.

## Running the app

- Use the Conductor run buttons or the scripts behind them (`.conductor/README.md`). `run-ios.sh` runs the simulator with hot reload; its output is Metro's — bundling errors and the app's logs. `run-web.sh` serves the static web export: no hot reload (the Expo dev server can't serve this app on web), so restart it after a change, and the app's logs are in the browser's devtools console.
- Dev builds and the run scripts use **fixture AI mode**: recorded responses, no key, no tokens. Pass `AI_MODE=proxy` (the `-proxy` run buttons) for real generations.
- To set up data: Me → Settings → Developer loads the fixture interest, clears everything, or starts over with only the fixture interest. On the simulator, run `pnpm seed:sim` (add the fixture interest), `pnpm seed:sim --fresh` (clear, then add it) or `pnpm reset:sim` (empty). On web, open `/dev/reset` or `/dev/reset?seed=1`.
- Drive the simulator with semantic selectors: a known `testID` or stable visible text. When a selector is unknown or fails, `pnpm ui:tree` prints the accessibility tree; a connected Maestro MCP session has `inspect_screen` and `take_screenshot`. Add a `testID` only when a committed flow needs one. Never commit coordinate taps.

## Making changes

**Database.** Edit `packages/db/src/schema.ts`, run `generate`, then `snapshot`, and commit the SQL, the `meta/` files, `migrations.js` and the new snapshot together. Migrations are additive-first; a test fails on any drop, rename or retype that isn't in its commented allowlist. Never edit an applied migration. Every synced table carries `updated_at` and `deleted_at`: soft-delete, never hard-delete synced rows. IDs are UUIDv7 generated client-side. Timestamps are epoch ms UTC, and day boundaries use the device's local timezone.

**Prompts.** One template per kind in `src/prompts/kinds/`, registered in `registry.ts`. Request fields (model, limits, thinking, tools) come only from `modelRequestFields` — never build them at a call site. A Sonnet kind states its `effort` and leaves `maxTokens` room for thinking plus output (`docs/04` §Thinking). On any change:
- Bump the template's `version`.
- Review the prompt snapshot diff and update it with vitest `-u`. The diff is the review.
- Run `pnpm prompt:check <kind>`, then eyeball the output in the AI Inspector. Quality judgment stays human.

How a person reviews a prompt change: the snapshot diff in the PR shows exactly what the model will now be sent. Then run the app in proxy mode, trigger that kind, and open Me → Settings → Developer → AI Inspector to read each call's full prompt, response, tokens and cost.

Write the Inspector verdict — what you checked, what's good, what's still off — in the PR description. Re-record `fixtures/recorded/<kind>` only deliberately. A new kind needs a recording, added to `src/fixtures/recorded.ts`, which also enrolls it in the malformed-output checks (`src/fixtures/recorded.test.ts`).

**UI.** Match the existing patterns in `apps/mobile/src/components` before adding a component. Design tokens only — no hardcoded colors or font sizes.

**TypeScript.** Strict everywhere; no `any` at module boundaries.

## Testing

The full strategy is in `docs/10-testing.md`; read it before writing tests.

- Effort concentrates in `packages/core` and `packages/db`: the scheduler, schemas, prompt assembly and the migration chain are where bugs are expensive or unfixable.
- UI gets one behavioral test per activity block type and nothing else — no screen snapshots, no styling assertions.
- The LLM boundary is tested with recorded fixtures, never live calls.
- Don't over-produce tests. Skip tests that restate a schema, assert a mock was called, or re-cover a branch that's already covered.

## Commits and pull requests

- Commit messages use `type(scope): summary`, imperative and lowercase — e.g. `fix(db): keep tombstones out of history`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scopes: `mobile`, `web`, `core`, `db`, `config`, `ci`. Drop the scope when a change spans several.
- A PR closes its issue (`Closes #12`), passes `pnpm verify`, and updates any doc that reality has drifted from.
- A change a learner would notice gets a line under `## Unreleased` in `CHANGELOG.md`, in the product's plain voice. Refactors, tests and docs don't (`RELEASING.md`).
