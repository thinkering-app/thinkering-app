# CLAUDE.md — guidance for agent sessions

thinkering is a local-first mobile learning app for adults. This is a production codebase intended for long-term maintenance and open-source collaboration — favor boring, well-factored solutions over clever ones.

## Start here

1. Read `docs/00-overview.md` for vocabulary, decisions, and open questions. Use the canonical vocabulary (Interest, Goal, Activity, Section, Library item, "Put to use") in code and copy.
2. Find your task's context in `docs/09-roadmap.md` — milestones are broken into session-sized work packages with acceptance criteria.
3. The relevant deep-dive doc (data model, AI pipeline, activity format, design system) is authoritative. If you must deviate, update the doc in the same PR and note why.

## Repo layout (once scaffolded)

- `apps/mobile` — Expo app (expo-router, TypeScript strict, NativeWind)
- `apps/web` — Next.js: landing page + API routes (AI proxy, feedback, usage metering)
- `packages/core` — shared domain types, Zod schemas, prompt templates, library definitions, scheduler logic (pure TS, no React)
- `packages/db` — Drizzle schema + migrations for expo-sqlite
- `packages/config` — shared Tailwind/design tokens, tsconfig, eslint

## Hard rules

- **Local-first**: user learning data is written to local SQLite only. Nothing user-generated leaves the device except (a) LLM calls through the proxy, (b) opt-in Supabase backup, (c) opt-in anonymous PostHog events per the schema in `docs/08`, (d) explicitly user-shared activity reports (`docs/08`).
- **No secrets in the client.** The Anthropic key lives only in `apps/web` API routes. The only client-side key is a user's own BYO Anthropic key in SecureStore.
- **All LLM output crosses a Zod boundary.** Never render or store unvalidated model output. Schemas live in `packages/core`.
- **Prompts are code.** Every prompt is a versioned template in `packages/core/prompts` with a `kind` id; every call is logged to the local `llm_calls` table so the AI Inspector can show it. No inline ad-hoc prompts.
- **Minimal user-facing text.** No helper paragraphs, no onboarding tooltips, no exclamation-mark cheerleading. If a screen needs explaining, redesign the screen. Copy is sentence case, short, warm but plain.
- **Deterministic scheduling.** What appears on Today is decided by pure functions in `packages/core/scheduler` from DB state — the LLM generates content, never the schedule.

## Conventions

- TypeScript strict everywhere; no `any` at module boundaries.
- IDs are UUIDv7 generated client-side. Timestamps are epoch ms UTC; day boundaries computed in the device's local timezone.
- Every synced table carries `updated_at` and `deleted_at` (tombstone) — soft-delete, never hard-delete synced rows.
- Migrations via drizzle-kit, bundled and applied with `useMigrations` on app start. Never edit an applied migration.
- Match existing component patterns in `apps/mobile/src/components` before adding new ones. Design tokens only — no hardcoded colors or font sizes.
- Commit messages: conventional-ish, imperative, scoped (`mobile:`, `web:`, `core:`, `db:`, `docs:`).

## Testing

Full strategy in `docs/10-testing.md` — read it before writing tests. The short version:

- **`pnpm verify`** (typecheck + lint + vitest) is the gate. Run it before calling a work package done; it must stay under a minute and never touch the network, a model, or a simulator.
- **Iterate narrow, gate wide.** While working, run only what you're changing: `pnpm --filter @thinkering/core test src/scheduler` (sub-second), or `test:watch` in any package. `pnpm verify` is for the end of a work package, not for every edit. Coverage is off locally and enforced in CI — `pnpm --filter @thinkering/core test:cov` runs it by hand.
- **Don't run `pnpm e2e` while iterating.** The Maestro flows are a pre-release check (`docs/10` Tier 6), not a verification step — they need a booted simulator, an install, and Metro in fixture mode, they take minutes, and they deliberately cover no screen layout. To _see_ an iOS change, run the app and `pnpm seed:sim`: fixture interest, path, history, today's cards, in a second. Touch the flows only when the task is a release or the change is to `.maestro` itself.
- **Drive the simulator by semantic selectors.** Reuse a known `testID` or stable visible text. If the selector is unknown or fails, `pnpm ui:tree` prints the current accessibility tree; connected Maestro MCP sessions can use `inspect_view_hierarchy` and `take_screenshot`. Add a unique `testID` only when a committed flow needs one or visible text is unsuitable. Never commit coordinate taps; they are an ad-hoc last resort, not an application API. See `docs/10` Tier 6.
- **Effort concentrates in `packages/core` and `packages/db`.** Scheduler, schemas, prompt assembly, and the migration chain are where bugs are expensive or unfixable later. UI gets a behavioral test per activity block type and nothing else — no screen snapshots, no styling assertions.
- **The LLM boundary is tested with recorded fixtures, never live calls.** Every kind keeps a corpus of malformed output that must fail validation cleanly.
- **Prompt changes**: `pnpm prompt:check <kind>` for structural assertions, then eyeball the output in the AI Inspector before merging. Quality judgment stays human.
- **Don't over-produce tests.** No tests that restate a schema, assert a mock was called, or re-cover a branch already covered.
