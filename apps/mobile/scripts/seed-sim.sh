#!/usr/bin/env bash
# Put the running simulator's data into a known state (docs/10 Tier 6):
#
#   seed-sim.sh            add the fixture interest — a path, a week of history,
#                          and today's cards with their documents attached
#   seed-sim.sh --fresh    clear everything first, then add the fixture interest
#   seed-sim.sh --empty    clear everything and land on the intake welcome
#
# This is the cheap way to look at an iOS change: the app is where you need it
# in a second or two, with no tokens and no network. Running the Maestro suite
# to get there costs minutes and is not what it is for.
#
# The app must already be running against this workspace's Metro
# (.conductor/run-ios.sh). Seeding is idempotent, so re-running is a no-op.
#
# Env: METRO_PORT (default 8081; Conductor's iOS script uses $CONDUCTOR_PORT + 2)
#      EXPO_GO=1  (drive Expo Go instead of the dev client)
set -euo pipefail

port="${METRO_PORT:-8081}"

case "${1:-}" in
  "") path="dev/seed" ;;
  --fresh) path="dev/reset?seed=1" ;;
  --empty) path="dev/reset" ;;
  *)
    echo "Usage: seed-sim.sh [--fresh | --empty]" >&2
    exit 1
    ;;
esac

udid="$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' | head -1)"
if [ -z "$udid" ]; then
  echo "No booted simulator. Start the app first: .conductor/run-ios.sh" >&2
  exit 1
fi

if [ "${EXPO_GO:-0}" = "1" ]; then
  url="exp://127.0.0.1:$port/--/$path"
else
  url="thinkering://$path"
fi

echo "==> $url"
xcrun simctl openurl "$udid" "$url"
