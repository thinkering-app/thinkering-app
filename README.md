# thinkering

A mobile app for adults' personal learning. You tell thinkering what you want to learn and why; it builds a pedagogically sound path of well-scoped goals and generates short, interactive activities each day — introduce something new, strengthen what you know, and put it to use.

**Status: scaffolded (M0).** The monorepo builds everywhere; implementation follows the roadmap in `docs/09-roadmap.md`.

## Getting started

```sh
pnpm install
pnpm verify            # typecheck + lint + tests — the gate for every PR
pnpm --filter @thinkering/mobile dev    # Expo dev server (press i for iOS simulator)
pnpm --filter @thinkering/web dev       # landing page at localhost:3000
```

Workspace layout: `apps/mobile` (Expo app), `apps/web` (Next.js landing + future API), `packages/core` (pure-TS domain), `packages/config` (shared tokens, tsconfig, eslint). See `docs/02-architecture.md`.

Deploys (Vercel, manual for now): `apps/web` is a standard Next.js project; the Expo web export deploys from `apps/mobile` (`vercel.json` there sets the COOP/COEP headers expo-sqlite's wasm build needs) for the future `app.thinkering.app` subdomain.

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

## Planned stack

pnpm monorepo · Expo (iOS-first, Android + web capable) · expo-router · TypeScript strict · expo-sqlite + Drizzle ORM · Next.js on Vercel (landing + API proxy) · Claude API · Supabase (optional backup/sync, usage metering) · Resend (feedback) · PostHog (anonymous, opt-in) · NativeWind + shared Tailwind tokens.

## License

AGPL-3.0 (see `LICENSE`).
