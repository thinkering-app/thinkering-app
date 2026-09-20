# Conductor scripts

`settings.toml` wires five buttons into every workspace. The scripts are plain
bash — `bash .conductor/run-web.sh` etc. works from a terminal too.

## Setup

`setup.sh` runs once per new workspace: `pnpm install --frozen-lockfile`, plus a
check that `apps/mobile/.env` and `apps/web/.env` arrived. Conductor copies those
two in automatically (its default "Files to copy" pattern is `.env*`, which
matches at any depth); if one is missing, setup falls back to `.env.example` and
says which values are blank. `apps/mobile/.env` works blank — the app runs in
fixture AI mode. `apps/web/.env` needs a real `ANTHROPIC_API_KEY` for `/api/ai`.

Every app script runs in **fixture AI mode** — recorded responses, no key, no
tokens — whatever `apps/mobile/.env` says. The `-proxy` variants (`AI_MODE=proxy`)
make real generations. All of them carry the developer tools: Me → Settings →
Developer switches AI mode and clears or reseeds the data.

## Run: app (web)

The static web export, served on `$CONDUCTOR_PORT` with the deployment's
COOP/COEP headers — the same pair the Playwright suite uses, so what you see is
what Vercel serves. Expo's _dev_ server can't run this app (expo-sqlite's web
worker chunk fails under `web.output: 'static'`), so there is no hot reload:
restart the script after a change and it re-exports in about a minute.

To start from a known state, open `/dev/reset` (empty) or `/dev/reset?seed=1`
(only the fixture interest) on the app's port.

**app-proxy** is the same export against the _landing_ script's `/api`, which
has to be running too with `ANTHROPIC_API_KEY` in `apps/web/.env`; the
production proxy doesn't answer browsers on localhost. It uses the app's port,
so stop the fixture one first.

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

`THINKERING_SIM` picks the simulator (default `iPhone 17`); a simulator that
is already booted wins. Xcode 27 has no Simulator.app — the script opens
DeviceHub, where you select the simulator to get a window. Headless also works:
`xcrun simctl io booted screenshot shot.png`.

One simulator can only show one workspace's Metro at a time; starting the script
in another workspace re-aims it.

With the app up, `pnpm reset:sim` empties it (intake welcome) and
`pnpm seed:sim --fresh` starts it over with only the fixture interest;
`pnpm seed:sim` adds that interest to whatever is there.

**ios-proxy** makes real generations through the proxy in `apps/mobile/.env`
(production by default). Switching between the two clears Metro's cache once,
since the mode is inlined into the bundle.

## Run: landing

`next dev` for `apps/web` (landing page + `/api` routes) on `$CONDUCTOR_PORT + 1`.
**app-proxy** points at it automatically; for iOS, set `EXPO_PUBLIC_API_URL`
to that port in `apps/mobile/.env` and use **ios-proxy**. Note that
`next dev` rewrites `apps/web/next-env.d.ts` to the `.next/dev` type paths and
drops a generated `AGENTS.md`/`CLAUDE.md` in `apps/web` (gitignored) — expected noise, not
yours.
