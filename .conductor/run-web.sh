#!/usr/bin/env bash
# Run the app in a browser: the same static web export that ships to Vercel,
# served with the deployment's COOP/COEP headers (expo-sqlite's wasm build needs
# cross-origin isolation for OPFS).
#
# The Expo *dev* server can't serve this app — expo-sqlite's web worker chunk
# fails under `web.output: 'static'` — so there is no hot reload here. After a
# change, restart the script to rebuild.
#
# Env: PORT     (default 4173; Conductor passes $CONDUCTOR_PORT)
#      AI_MODE  fixture (default) | proxy — overrides apps/mobile/.env
#      API_URL  the proxy for AI_MODE=proxy. A browser on localhost can only
#               reach a proxy that allows it, which production doesn't, so point
#               this at the landing run script (Conductor passes that port).
#
# The export carries the developer tools either way (Me → Developer, and the
# /dev/reset, /dev/reset?seed=1 and /dev/seed URLs); a Vercel build never does.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/apps/mobile"

export EXPO_PUBLIC_AI_MODE="${AI_MODE:-fixture}"
export EXPO_PUBLIC_DEV_TOOLS=true
if [ -n "${API_URL:-}" ]; then export EXPO_PUBLIC_API_URL="$API_URL"; fi

echo "==> exporting the web build in $EXPO_PUBLIC_AI_MODE mode (~1 minute)"
npx expo export -p web

echo "==> serving on http://localhost:${PORT:-4173}"
exec node scripts/serve-web.mjs
