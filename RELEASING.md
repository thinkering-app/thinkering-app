# Releasing

## Versioning

`version` in `apps/mobile/app.config.ts` is the **user-visible** version and the
only one a human edits. Build numbers are EAS's: `eas.json` sets
`appVersionSource: "remote"`, so `ios.buildNumber` is incremented server-side by
the `production` profile and never lives in the repo.

Semver, read from the learner's side:

- **patch** (0.1.0 → 0.1.1) — fixes, copy, polish.
- **minor** (0.1.0 → 0.2.0) — a new surface or a real behavior change.
- **major** — reserved for 1.0, the first public App Store release.

A version is bumped in its own commit, `mobile: release 0.2.0`, which also moves
`CHANGELOG.md`'s `## Unreleased` section under the new heading with a date.

## Changelog

`CHANGELOG.md` is written for the person using the app, not for us: what
changed for them, in the same plain voice as the rest of the product (`07`).
Anything that has no effect on a learner — refactors, tests, docs, dependency
bumps — doesn't get an entry. Keep `Added` / `Changed` / `Fixed` sections, drop
the ones that are empty.

The App Store "What's New" text is that section, verbatim.

## Cutting a build

```sh
pnpm verify                     # the gate (docs/10)
pnpm --filter @thinkering/db sync:check    # against a real Supabase project
JAVA_HOME=/usr/local/opt/openjdk pnpm e2e  # the three Maestro flows
```

Then:

```sh
eas build -p ios --profile production
eas submit -p ios --profile production     # → TestFlight
```

Both need `eas login` as the account that owns the Apple Developer membership.
Run them **from `apps/mobile`**, not the repo root: that's where the Expo app,
its `app.config.ts` and its `eas.json` are. `eas init` at the root creates a
stray `app.json`/`eas.json` for a project that doesn't exist there.

The EAS project is already linked — `thinkering-app/thinkering-v1`, id in
`extra.eas.projectId`. `submit.production.ios.ascAppId` in `eas.json` is still a
placeholder until the app exists in App Store Connect.

### Environment

EAS builds don't read `.env`. The public client values live as EAS environment
variables on the `production` and `preview` environments:

| Variable                                | Notes                                            |
| --------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`                   | Set in `eas.json`; the proxy's origin.           |
| `EXPO_PUBLIC_SUPABASE_URL`              | Backup. Unset hides synced backup entirely.      |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | `sb_publishable_…`. Public by design.            |
| `EXPO_PUBLIC_POSTHOG_KEY`               | Unset makes analytics inert (`08`).              |
| `EXPO_PUBLIC_POSTHOG_HOST`              | Defaults to the US cloud, the project's region.  |
| `EXPO_PUBLIC_FEATUREBASE_PORTAL_URL`    | Unset hides the community feedback option.       |

Server secrets (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`)
belong to `apps/web` on Vercel and never reach a build.

## Before the first submission

- Apply `apps/web/supabase/schema.sql` to the production Supabase project. It
  is re-runnable; re-apply it whenever it changes.
- Set a monthly spend limit in the Anthropic Console (Settings → Limits) for
  the workspace the proxy's key belongs to. The proxy's own caps (`docs/04`
  §Usage metering) stop at a day; this is the backstop past them.
- In the PostHog project settings, turn on **Record user sessions** (replay
  records nothing without it) and **Discard client IP data** (replays come from
  the native SDK, which the app's `$ip: null` doesn't reach). `docs/08`.

- App Privacy answers: `docs/08-analytics-and-privacy.md` §App Store privacy
  disclosures.
- The Featurebase moderation checklist: `docs/10-testing.md` §Tier 6. Guideline
  1.2 applies because the WebView shows other people's posts.
- Account deletion is reachable in-app (Me → Backup → Account → Delete account).
- `/privacy` on the landing site is live and matches the in-app page — they
  share their copy, so this is a deploy check, not a copy check.
