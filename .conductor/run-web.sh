#!/usr/bin/env bash
# Run the app in a browser: the same static web export that ships to Vercel,
# served with the deployment's COOP/COEP headers (expo-sqlite's wasm build needs
# cross-origin isolation for OPFS).
#
# The Expo *dev* server can't serve this app — expo-sqlite's web worker chunk
# fails under `web.output: 'static'` — so there is no hot reload here. After a
# change, restart the script to rebuild.
#
# Env: PORT (default 4173; Conductor passes $CONDUCTOR_PORT)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/apps/mobile"

echo "==> exporting the web build (~1 minute)"
npx expo export -p web

echo "==> serving on http://localhost:${PORT:-4173}"
exec node scripts/serve-web.mjs
