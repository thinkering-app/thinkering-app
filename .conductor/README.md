# Conductor scripts

`settings.toml` wires three buttons into every workspace. The scripts are plain
bash — `bash .conductor/run-web.sh` etc. works from a terminal too.

## Setup

`setup.sh` runs once per new workspace: `pnpm install --frozen-lockfile`, plus a
check that `apps/mobile/.env` and `apps/web/.env` arrived. Conductor copies those
two in automatically (its default "Files to copy" pattern is `.env*`, which
matches at any depth); if one is missing, setup falls back to `.env.example` and
says which values are blank. `apps/mobile/.env` works blank — the app runs in
fixture AI mode. `apps/web/.env` needs a real `ANTHROPIC_API_KEY` for `/api/ai`.

## Run: app (web)

The static web export, served on `$CONDUCTOR_PORT` with the deployment's
COOP/COEP headers — the same pair the Playwright suite uses, so what you see is
what Vercel serves. Expo's *dev* server can't run this app (expo-sqlite's web
worker chunk fails under `web.output: 'static'`), so there is no hot reload:
restart the script after a change and it re-exports in about a minute.

## Run: app (iOS simulator)

First run compiles a development client and caches it at
`~/Library/Caches/thinkering/dev-client/thinkering.app` — about ten minutes, once
per machine. The binary holds no app JavaScript, so every workspace afterwards
reuses it: install (seconds), start Metro on `$CONDUCTOR_PORT + 2`, deep-link the
dev client at that port. Hot reload works.

Rebuild only when the native side changes — a new Expo module, an SDK bump, a
native field in `app.config.ts`:

```sh
bash .conductor/run-ios.sh --rebuild
```

`THINKERING_SIM` picks the simulator (default `iPhone 17 Pro`); a simulator that
is already booted wins. Xcode 27 has no Simulator.app — the script opens
DeviceHub, where you select the simulator to get a window. Headless also works:
`xcrun simctl io booted screenshot shot.png`.

One simulator can only show one workspace's Metro at a time; starting the script
in another workspace re-aims it.

## Run: landing

`next dev` for `apps/web` (landing page + `/api` routes) on `$CONDUCTOR_PORT + 1`.
To point the app at it instead of production, set `EXPO_PUBLIC_API_URL` to that
port in `apps/mobile/.env` and use `EXPO_PUBLIC_AI_MODE=proxy`. Note that
`next dev` rewrites `apps/web/next-env.d.ts` to the `.next/dev` type paths and
drops a generated `AGENTS.md`/`CLAUDE.md` in `apps/web` — expected noise, not
yours.
