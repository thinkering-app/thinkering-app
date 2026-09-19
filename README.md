# thinkering

A mobile app for adults' personal learning. You tell thinkering what you want to learn and why; it builds a pedagogically sound path of well-scoped goals and generates short, interactive activities each day — introduce something new, strengthen what you know, and put it to use.

**Status: feature-complete for a first beta (M9).** Intake, Today, the activity player, Path, History, Me, backup and sync, the landing site, and opt-in analytics are all built; what's left before TestFlight is in [RELEASING.md](RELEASING.md). Progress and deviations are recorded milestone by milestone in `docs/09-roadmap.md`.

## Getting started

```sh
pnpm install
cp apps/mobile/.env.example apps/mobile/.env  # configure local app integrations as needed
pnpm verify            # typecheck + lint + tests — the gate for every PR
pnpm --filter @thinkering/mobile dev    # Expo dev server (press i for iOS simulator)
pnpm --filter @thinkering/web dev       # landing page at localhost:3000
```

Dev builds run in **fixture AI mode** unless told otherwise: every generation is a recorded response, so the whole app works offline and at zero cost. Set `EXPO_PUBLIC_AI_MODE=proxy` (or run the `.conductor` scripts with `AI_MODE=proxy`) for real generations. Fixture mode is also how the three Maestro end-to-end flows run — `pnpm e2e`, see `apps/mobile/.maestro/README.md`. To start over, Me → Settings → Developer clears or reseeds the data; on the simulator, `pnpm reset:sim` and `pnpm seed:sim --fresh` do the same.

Workspace layout: `apps/mobile` (Expo app), `apps/web` (Next.js landing + API proxy), `packages/core` (pure-TS domain), `packages/db` (Drizzle schema, migrations, repositories), `packages/config` (shared tokens, tsconfig, eslint). See `docs/02-architecture.md`.

Deploys (Vercel, manual for now): `apps/web` is a standard Next.js project; the Expo web export deploys from `apps/mobile` (`vercel.json` there sets the COOP/COEP headers expo-sqlite's wasm build needs, and clean URLs with an app-shell fallback so a reload on any screen doesn't 404) to `web.thinkering.app`.

## Principles

- **Local-first.** Your learning data lives on your device (SQLite). Supabase backup/sync is optional and off by default.
- **Small, honest AI.** Claude generates paths and activities through a thin metered proxy; prompts are versioned, inspectable code, not black boxes.
- **Calm interface.** Minimal text, clear daily structure (Next / Strengthen / Go further), no gamification noise.
- **Open, extensible library.** Activities are built from a library of learning strategies grounded in learning science — a core area for open-source contribution.

## Docs

| Doc                                                          | What it covers                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [00-overview](docs/00-overview.md)                           | Vision, vocabulary, decision log, open questions                            |
| [01-product-spec](docs/01-product-spec.md)                   | Full product spec: intake, tabs, flows                                      |
| [02-architecture](docs/02-architecture.md)                   | Monorepo, stack, local-first storage, sync, AI proxy, security              |
| [03-data-model](docs/03-data-model.md)                       | SQLite schema and sync metadata                                             |
| [04-ai-pipeline](docs/04-ai-pipeline.md)                     | Every LLM call: trigger, model, latency, caching, usage caps, observability |
| [05-activity-format](docs/05-activity-format.md)             | The Activity Document JSON format and renderer contract                     |
| [06-library](docs/06-library.md)                             | The initial activity library (learning strategies)                          |
| [07-design-system](docs/07-design-system.md)                 | Color, typography, components, aesthetic direction                          |
| [08-analytics-and-privacy](docs/08-analytics-and-privacy.md) | PostHog event schema, privacy stance                                        |
| [09-roadmap](docs/09-roadmap.md)                             | Milestones broken into buildable work packages                              |
| [10-testing](docs/10-testing.md)                             | Test strategy: what gets tested, what deliberately doesn't                  |
| [RELEASING](RELEASING.md)                                    | Versioning, changelog conventions, cutting a build, pre-submission checks   |

## Stack

pnpm monorepo · Expo (iOS-first, Android + web capable) · expo-router · TypeScript strict · expo-sqlite + Drizzle ORM · Next.js on Vercel (landing + API proxy) · Claude API · Supabase (optional backup/sync, usage metering) · Featurebase (community feedback) · Resend (private feedback) · PostHog (anonymous, opt-in) · NativeWind + shared Tailwind tokens.

## License

AGPL-3.0 (see `LICENSE`).
