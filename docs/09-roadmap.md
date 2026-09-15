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

**Done 2026-09-15.** Deviations, recorded in the docs they touch: G1's experience params are optional and the prompt says so (`04`) — docs/01 fires G1 on the screen *before* the experience question, which the old contract couldn't express; G1's fields are word-budgeted and G3's `maxTokens` is 4000 with 2–5-word concept labels, both from running the prompts live (`04`, `07`); `EXPO_PUBLIC_AI_MODE` sets the starting AI mode, since Me isn't reachable until intake is done (`02`); new components `TextField`, `ProgressDots`, `Generating` are in `07`. Two bugs the simulator caught: Hermes has no global `crypto`, so every `uuidv7()` threw until the app installed expo-crypto's `getRandomValues` (`apps/mobile/src/crypto-polyfill.ts`), and `loadFixtures` named the base input fixture after its file rather than `default`, so `--record` wrote alongside the recording instead of replacing it. Verified on the iOS simulator in fixture mode, end to end, including relaunch and the three logged calls in the AI Inspector.

- ~~**WP3.1 Intake UI**~~ ✅: 6 steps per `01`, chips, progress, back nav, generating states; writes interest/topics/goals.
- ~~**WP3.2 Intake generation wiring**~~ ✅: G1/G2/G3 orchestration (background kickoffs, dependency on G1, streamed step 6), error/retry states.

## M4 — Today & activity player

**Done 2026-09-15.** Deviations, recorded in the docs they touch: G5a's daily plan is cached as its `planned` activity rows rather than in `gen_cache`, and a configure change re-plans only the affected section's untouched cards (`03`); `activities` gained a nullable `topic` for the prerequisite-fallback card, which the schema couldn't express (`03`, migration 0001); the client zips G5a's cards with the scheduler's picks by position and ignores the returned `goal_id` (`04`); the Ask button sits in the navigation footer, not the header (`05`); `resourceEmbed` video degrades to a link card on the web export, which has no WebView (`05`); G6/G7/G11 templates and `activity.generate` v2 are in `04`. Three prompt-level fixes came out of running the kinds live — fence-stripping at the parse boundary, spelling out the block `"kind"` discriminator, and pinning the closing review/summary pages (`04`). New deps: `react-native-webview`, and a `jest-expo` + RNTL harness for the renderer tests (`10`). Verified on the iOS simulator in fixture mode: plan → card → streamed activity → interactions → G6 review page → summary rating → completion wash on Today.

- ~~**WP4.1 Today screen**~~ ✅: interest selector pills (+ Explore row), section headers with completion wash + counts, cards from scheduler + G5a (cached daily plan), configure sheets (library checkboxes + info dialogs), routine free-text (G11).
- ~~**WP4.2 Activity player**~~ ✅: renderer for all block types against fixtures (including `resourceEmbed` video/article embeds) — progress bar, back/forward, response persistence, summary rating + share-activity action, resume. No LLM needed (fixtures). One behavioral test per block kind + the unknown-kind placeholder (`10`).
- ~~**WP4.3 Live generation**~~ ✅: G5b streamed into the player (first page fast), Next-card prefetch, G6 review-page fill, G7 Ask inserted pages, goal status transitions + completion states.

## M5 — Path

**Done 2026-09-15.** Deviations, recorded in the docs they touch: reorder is a long-press mode with up/down controls rather than a drag gesture (`01`) — a drag implementation wasn't worth its own gesture handler for a 5–8 item list; G8 is awaited behind a branded wait rather than streamed, and its additions live only in `suggestedGoals` (`04`); G8 addresses goals by short refs (`G1`, `G2`, …) that the client maps back, dropping any it doesn't recognise (`04`); G9's cache key ignores goal status and order, so suggestions go stale when the path changes rather than when the learner progresses (`04`); G10 gained `goalTitles` so pasted links match goals the way G4's do (`04`). New surfaces on the server: `POST /api/fetch-url` with the SSRF guards add-by-link needs, and `PromptTemplate.tools` for G4's web search. One bug the simulator caught: bottom sheets sat behind the keyboard, which affected M4's sheets too — fixed in `Sheet`. Verified on the iOS simulator in fixture mode: intake → Path (expand, reorder, edit, suggestions) → reflection → path update → resources (G4-seeded list, add-by-link draft) → path settings.

- ~~**WP5.1 Goal list**~~ ✅: status color treatments, expandable concepts/skills with coverage (D16), reorder, edit; suggested goals (G9); path settings screen (all editable intake fields + contexts).
- ~~**WP5.2 Reflection**~~ ✅: flow per `01` with G8; path update application; Today's reflect card trigger (≤3 not-started goals).
- ~~**WP5.3 Resources**~~ ✅: list + add-by-link (G10 w/ server URL fetch), intake seeding via G4 (web_search), resources wired into the per-interest context (and G5a's `matchedResources`).

## M6 — History & Me

- **WP6.1 History**: grouped-by-day list with outcome lines, per-interest/all-explore filtering, lazy loading.
- **WP6.2 Me**: Manage Interests (reorder, focus/exploring/archived), calendar month view + day detail, settings shell, AI usage meter + BYOK entry (SecureStore), PostHog toggle, privacy placeholder, and dual-channel feedback per `01`: a Featurebase portal WebView/new-tab fallback plus the private email form and separate activity-report route.

## M7 — Landing page

- **WP7.1**: real landing per `01 §8` — **ask Reb for draft copy at session start** — privacy page, app-subdomain deploy of the Expo web export.

## M8 — Backup & sync

- **WP8.1 Export/import**: versioned JSON export via share sheet; import with validation + confirm-replace; round-trip and version-refusal tests.
- **WP8.2 Supabase sync**: auth screens (email/password), server schema + RLS, LWW push/pull with cursors, off-switch server-data deletion, conflict tests.

## M9 — Analytics, polish, release

- **WP9.1 PostHog & privacy**: typed `track()` wrapper + full `08` schema, including the three content-free feedback events; pre-consent local buffer (flush on opt-in, delete on decline); opt-in flow (one-time ask after first completed activity + Me toggle); provider/privacy copy and App Store privacy disclosures.
- **WP9.2 Polish pass**: texture assets, watercolor accents, motion, empty states, app icon/splash.
- **WP9.3 Release**: the three Maestro E2E flows in fixture AI mode (`10`), EAS build profiles, TestFlight, versioning/changelog conventions, and the Featurebase configuration/moderation checklist in `10`. If Featurebase cannot provide end-user reporting for embedded user-generated content, open it in the system browser on iOS instead of the WebView.

## Later

Share extension (share link → resource → activity material) · reminders/notifications aligned to chosen frequency · Android polish · App Attest · dark mode · widget.

## Suggested session prompts

Each WP maps to a prompt like: _"Implement WP2.2 per docs/09-roadmap.md — read docs/04 and docs/06 first; acceptance: fixtures run green via `pnpm prompt:run intake.path`."_ Keep one WP per session; update docs in the same PR when reality diverges. A WP isn't done until `pnpm verify` passes and the tests named in its acceptance criteria exist — see `10-testing.md` for what to write and what to leave alone.
