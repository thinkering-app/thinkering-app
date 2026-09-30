# thinkering

A mobile app for adults' personal learning. You tell thinkering what you want to learn and why; it builds a pedagogically sound path of well-scoped goals and generates short, interactive activities each day — introduce something new, strengthen what you know, and put it to use.

**Status: in beta.** Intake, Today, the activity player, Path, History, Me, backup and sync, the landing site and anonymous analytics are built; what's left before TestFlight is in [RELEASING.md](RELEASING.md). Not built yet: a share extension, reminders, widgets, dark mode and an Android polish pass.

## Getting started

```sh
pnpm install
cp apps/mobile/.env.example apps/mobile/.env  # configure local app integrations as needed
pnpm verify            # typecheck + lint + tests — the gate for every PR
pnpm --filter @thinkering/mobile dev    # Expo dev server (press i for iOS simulator)
pnpm --filter @thinkering/web dev       # landing page at localhost:3000
```

Dev builds run in **fixture AI mode**: every generation is a recorded response, so the whole app works offline, at no cost, with no API key. Set `EXPO_PUBLIC_AI_MODE=proxy` for real generations. To start over, Me → Settings → Developer clears or reseeds the data.

The development guide — repo layout, rules, commands, how to change the database or a prompt — is [AGENTS.md](AGENTS.md). It's written for coding agents and applies to everyone. To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Principles

- **Local-first.** Your learning data lives on your device (SQLite). Supabase backup and sync is optional and off by default.
- **Small, honest AI.** Claude generates paths and activities through a thin metered proxy; prompts are versioned, inspectable code, not black boxes.
- **Calm interface.** Minimal text, clear daily structure (Next / Strengthen / Go further), no gamification noise.
- **Grounded in learning science.** Activities are built from a library of learning strategies with research behind them.

## Docs

| Doc                                                          | What it covers                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [00-overview](docs/00-overview.md)                           | Vision, vocabulary, decisions                                          |
| [01-product-spec](docs/01-product-spec.md)                   | How each part of the app behaves                                       |
| [02-architecture](docs/02-architecture.md)                   | Stack, local-first storage, sync, AI access, security                  |
| [03-data-model](docs/03-data-model.md)                       | What each table is for, and the invariants                             |
| [04-ai-pipeline](docs/04-ai-pipeline.md)                     | Every model call: trigger, model, contract, cost controls, failures    |
| [05-activity-format](docs/05-activity-format.md)             | The Activity Document format and renderer contract                     |
| [06-library](docs/06-library.md)                             | The activity library (learning strategies)                             |
| [07-design-system](docs/07-design-system.md)                 | Color, type, texture, components, voice                                |
| [08-analytics-and-privacy](docs/08-analytics-and-privacy.md) | What's collected, what isn't, and the privacy disclosures              |
| [10-testing](docs/10-testing.md)                             | What gets tested, and what deliberately doesn't                        |
| [RELEASING](RELEASING.md)                                    | Versioning, changelog, deploys, cutting a build, pre-submission checks |

## Stack

pnpm monorepo · Expo (iOS-first, Android + web capable) · expo-router · TypeScript strict · expo-sqlite + Drizzle ORM · Next.js on Vercel (landing + API proxy) · Claude API · Supabase (optional backup/sync, usage metering) · Featurebase (community feedback) · Resend (private feedback) · PostHog (anonymous, on by default, off with one toggle) · NativeWind + shared Tailwind tokens.

## License

The code is licensed under AGPL-3.0 (see `LICENSE`).
