#!/usr/bin/env bash
# Conductor setup script — runs once when a workspace is created.
# Keep it fast and offline-ish: install dependencies, check the env files that
# Conductor copies in, and say what is missing. Native iOS builds are not done
# here; see .conductor/run-ios.sh.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found on PATH. Install it (npm i -g pnpm@9) and re-run setup." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 22 ]; then
  echo "Node $(node -v) is too old — the workspace needs >= 22." >&2
  exit 1
fi

echo "==> pnpm install"
pnpm install --frozen-lockfile

# Conductor copies gitignored .env files into new workspaces (Files to copy,
# default `.env*` pattern). If one is missing — a fresh clone, or a teammate
# without the secrets — fall back to the example so the app still boots.
missing=""
for app in mobile web; do
  env_file="apps/$app/.env"
  if [ ! -f "$env_file" ]; then
    cp "apps/$app/.env.example" "$env_file"
    missing="$missing $env_file"
  fi
done

echo
echo "Workspace ready."
if [ -n "$missing" ]; then
  echo
  echo "Created from .env.example (values are blank):$missing"
  echo "  apps/mobile/.env works blank — the app runs in fixture AI mode."
  echo "  apps/web/.env needs ANTHROPIC_API_KEY before /api/ai answers."
fi
