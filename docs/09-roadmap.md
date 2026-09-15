# 09 — Roadmap

Milestones broken into session-sized work packages (WP) suitable for one agent session each, with acceptance criteria. Order within a milestone is roughly dependency order; milestones after M2 can partially parallelize (e.g. M7 landing anytime after M0).

## M0 — Scaffold ✅-target: repo builds everywhere

**Done 2026-09-15** (except the Vercel deploys — configured but not executed; needs Reb's Vercel account. `apps/web` is a standard Next.js project; the app subdomain deploys the Expo web export from `apps/mobile`, whose `vercel.json` carries the COOP/COEP headers). Deviations from the specs, all recorded in the docs they touch: NativeWind stayed on v4 (v5 was still RC) with Tailwind on the 3.4 LTS line in both apps, since the shared preset (`packages/config/tailwind/preset.cjs`) uses the v3 preset model; root `.npmrc` sets `node-linker=hoisted` per Expo monorepo guidance; mobile is on the Expo SDK 57 template's TypeScript 6, core/web on 5.7. Verified on the iOS simulator via Expo Go (no native modules yet) and `expo export -p web`.

- ~~**WP0.1 Monorepo**~~ ✅: pnpm workspaces + turborepo; `packages/config` (tsconfig base, eslint, prettier, Tailwind preset with the `07` tokens); root scripts (`dev`, `lint`, `typecheck`, `test`, `verify`). CI: GitHub Actions running `pnpm verify` (see `10-testing.md`); vitest configured with the core lint rules banning `Date.now()`/`Math.random()` inside `packages/core`.
- ~~**WP0.2 Expo app**~~ ✅: create `apps/mobile` (Expo, TS strict, expo-router, NativeWind wired to the shared preset, Arvo/Outfit via expo-google-fonts). Tab shell (Today/Path/History/Me) with placeholder screens, `Screen`/`Card`/`Pill`/`Button` components, feedback button stub. Runs on iOS simulator + `expo export -p web` succeeds.
- ~~**WP0.3 Next.js app**~~ ✅ (deploy pending): create `apps/web` (App Router, Tailwind with shared preset, fonts). Placeholder landing + `/privacy`; deployed to Vercel with COOP/COEP headers configured for the future app subdomain.

## M1 — Data layer

**Done 2026-09-15.** Deviations, recorded in the docs they touch: `resourceEmbed`'s media field is `media`, not `kind` (`05`); the three fixture ActivityDocs live as typed exports in `packages/core/src/fixtures/activity-docs.ts` (validated by test) rather than JSON files; `pnpm seed` writes `packages/db/.data/seed.db` and the same `seedFixtureData()` backs a dev-only button on Me.

- ~~**WP1.1 Schema**~~ ✅: `packages/db` drizzle schema per `03`, drizzle-kit migrations, `useMigrations` on app start; UUIDv7 util; repository functions for interests/goals/activities/responses. Migration harness (better-sqlite3 in node): empty → head, the additive-first check, and the `fixtures/db/v<N>.sql` snapshot convention (`10`; `pnpm snapshot` dumps them).
- ~~**WP1.2 Core domain**~~ ✅: `packages/core` — domain types, Zod schemas (incl. ActivityDoc), library definitions (`06`), **scheduler** with unit tests covering the Today selection rules + fallback chains + day boundaries (incl. a DST transition); injected clock/id context; the malformed-model-output corpus for the ActivityDoc schema (`10`).
- ~~**WP1.3 Seed & fixtures**~~ ✅: seed script with a fixture interest, path, history, and 3 hand-written ActivityDocs (one per tier) for renderer development.

## M2 — AI plumbing

**Done 2026-09-15.** Deviations, recorded in the docs they touch: temperature is Haiku-only (Sonnet 5 rejects sampling params) and contract keys are camelCase (`04`); `devices` stores the raw secret since HMAC verification needs it, and `device_usage` gained `kind_calls` for burst limits (`03`, schema in `apps/web/supabase/schema.sql` — needs applying to the fresh Supabase project). `/api/ai` also accepts a `repair` turn for the schema-repair round-trip. Recorded fixtures for G1–G3/G5a are hand-authored placeholders until `pnpm prompt:run <kind> --record` replaces them with real ones (needs an API key); fixture mode serves `activity.generate` from the per-tier fixture docs.

- ~~**WP2.1 Proxy**~~ ✅: `apps/web/app/api` — device register (HMAC), `/api/ai` streaming passthrough by `kind`, metering in Supabase (`devices`, `device_usage`), budget headers, 429 behavior, `/api/usage`, `/api/feedback` (Resend).
- ~~**WP2.2 Prompt layer**~~ ✅: `packages/core/prompts` — template infrastructure (typed params → system/messages, PROMPT_VERSION, cache breakpoints), context assembly builder, pedagogy module; G1–G3 + G5a/G5b implemented with fixtures + `pnpm prompt:run` (incl. `--record`) and `pnpm prompt:check` structural + tone assertions (`10`).
- ~~**WP2.3 Client AI + Inspector**~~ ✅: `apps/mobile/src/ai` — call wrapper (proxy + BYO + **fixture** modes, SSE, incremental JSON page parsing, retry/repair), `llm_calls` logging, AI Inspector screen (dev + hidden toggle).

## M3 — Intake

- **WP3.1 Intake UI**: 6 steps per `01`, chips, progress, back nav, generating states; writes interest/topics/goals.
- **WP3.2 Intake generation wiring**: G1/G2/G3 orchestration (background kickoffs, dependency on G1, streamed step 6), error/retry states.

## M4 — Today & activity player

- **WP4.1 Today screen**: interest selector pills (+ Explore row), section headers with completion wash + counts, cards from scheduler + G5a (cached daily plan), configure sheets (library checkboxes + info dialogs), routine free-text (G11).
- **WP4.2 Activity player**: renderer for all block types against fixtures (including `resourceEmbed` video/article embeds) — progress bar, back/forward, response persistence, summary rating + share-activity action, resume. No LLM needed (fixtures). One behavioral test per block kind + the unknown-kind placeholder (`10`).
- **WP4.3 Live generation**: G5b streamed into the player (first page fast), Next-card prefetch, G6 review-page fill, G7 Ask inserted pages, goal status transitions + completion states.

## M5 — Path

- **WP5.1 Goal list**: status color treatments, expandable concepts/skills with coverage (D16), reorder, edit; suggested goals (G9); path settings screen (all editable intake fields + contexts).
- **WP5.2 Reflection**: flow per `01` with G8; path update application; Today's reflect card trigger (≤3 not-started goals).
- **WP5.3 Resources**: list + add-by-link (G10 w/ server URL fetch), intake seeding via G4 (web_search), resource consideration wired into G5b context.

## M6 — History & Me

- **WP6.1 History**: grouped-by-day list with outcome lines, per-interest/all-explore filtering, lazy loading.
- **WP6.2 Me**: Manage Interests (reorder, focus/exploring/archived), calendar month view + day detail, settings shell, feedback screen, privacy placeholder, AI usage meter + BYOK entry (SecureStore), PostHog toggle.

## M7 — Landing page

- **WP7.1**: real landing per `01 §8` — **ask Reb for draft copy at session start** — privacy page, app-subdomain deploy of the Expo web export.

## M8 — Backup & sync

- **WP8.1 Export/import**: versioned JSON export via share sheet; import with validation + confirm-replace; round-trip and version-refusal tests.
- **WP8.2 Supabase sync**: auth screens (email/password), server schema + RLS, LWW push/pull with cursors, off-switch server-data deletion, conflict tests.

## M9 — Analytics, polish, release

- **WP9.1 PostHog**: typed `track()` wrapper + full `08` schema, pre-consent local buffer (flush on opt-in, delete on decline), opt-in flow (one-time ask after first completed activity + Me toggle).
- **WP9.2 Polish pass**: texture assets, watercolor accents, motion, empty states, app icon/splash.
- **WP9.3 Release**: the three Maestro E2E flows in fixture AI mode (`10`), EAS build profiles, TestFlight, versioning/changelog conventions.

## Later

Share extension (share link → resource → activity material) · reminders/notifications aligned to chosen frequency · Android polish · App Attest · dark mode · widget.

## Suggested session prompts

Each WP maps to a prompt like: _"Implement WP2.2 per docs/09-roadmap.md — read docs/04 and docs/06 first; acceptance: fixtures run green via `pnpm prompt:run intake.path`."_ Keep one WP per session; update docs in the same PR when reality diverges. A WP isn't done until `pnpm verify` passes and the tests named in its acceptance criteria exist — see `10-testing.md` for what to write and what to leave alone.
