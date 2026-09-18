#!/usr/bin/env bash
# Run the app on the iOS simulator without recompiling per workspace.
#
# The native binary is a development client: it contains no app JavaScript, so
# one build serves every Conductor workspace — the workspace's Metro server
# supplies the bundle. The build is cached outside the worktree, compiled once
# and reinstalled in seconds afterwards.
#
# Rebuild only when native dependencies change (a new Expo module, an SDK bump,
# an app.config.ts native field): .conductor/run-ios.sh --rebuild
#
# Env: THINKERING_SIM (simulator name, default "iPhone 17")
#      METRO_PORT     (default 8081; Conductor passes $CONDUCTOR_PORT + 2)
#      AI_MODE        fixture (default) | proxy — overrides apps/mobile/.env
#
# Once it's up, `pnpm reset:sim` empties the app and `pnpm seed:sim --fresh`
# starts it over with only the fixture interest.
set -euo pipefail

ai_mode="${AI_MODE:-fixture}"

root="$(cd "$(dirname "$0")/.." && pwd)"
mobile="$root/apps/mobile"
port="${METRO_PORT:-8081}"
sim_name="${THINKERING_SIM:-iPhone 17}"
cache="${THINKERING_DEV_CLIENT:-$HOME/Library/Caches/thinkering/dev-client}"
app="$cache/thinkering.app"

rebuild=0
[ "${1:-}" = "--rebuild" ] && rebuild=1

# --- simulator ------------------------------------------------------------
udid="$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' | head -1)"
if [ -z "$udid" ]; then
  udid="$(xcrun simctl list devices available | sed -n "s/^ *$sim_name (\([0-9A-F-]\{36\}\)).*/\1/p" | head -1)"
fi
if [ -z "$udid" ]; then
  echo "No simulator named \"$sim_name\". Pick one from \`xcrun simctl list devices available\` and set THINKERING_SIM." >&2
  exit 1
fi
echo "==> simulator $udid"
xcrun simctl bootstatus "$udid" -b >/dev/null

# Xcode 27 replaced Simulator.app with DeviceHub — open whichever exists, then
# pick the simulator there to get a window. Headless works too:
# xcrun simctl io "$udid" screenshot shot.png
for ui in "/Applications/Xcode.app/Contents/Applications/DeviceHub.app" "$(xcode-select -p)/Applications/Simulator.app"; do
  if [ -d "$ui" ]; then open "$ui"; break; fi
done

# --- dev client -----------------------------------------------------------
if [ ! -d "$app" ] || [ "$rebuild" = 1 ]; then
  echo "==> building the dev client (once; ~10 minutes)"
  cd "$mobile"
  mkdir -p "$cache"
  rm -rf "$app"
  # --output drops the binary straight into the shared cache; expo prebuilds and
  # runs pod install first if apps/mobile/ios isn't there yet.
  npx expo run:ios --no-bundler --device "$udid" --output "$cache"
  if [ ! -d "$app" ]; then
    built="$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/thinkering-*/Build/Products/Debug-iphonesimulator/thinkering.app 2>/dev/null | head -1)"
    if [ -z "$built" ]; then
      echo "Build finished but produced no thinkering.app." >&2
      exit 1
    fi
    cp -R "$built" "$app"
  fi
  xcrun simctl install "$udid" "$app"
  echo "==> cached $app"
else
  echo "==> installing cached dev client (--rebuild to compile a fresh one)"
  xcrun simctl install "$udid" "$app"
fi

# Another workspace may have left the app pointed at its own Metro; a restart is
# what re-aims it at this one.
xcrun simctl terminate "$udid" app.thinkering >/dev/null 2>&1 || true

# --- metro ----------------------------------------------------------------
cd "$mobile"
# The mode is inlined into the bundle, so a change of mode clears Metro's cache
# rather than trusting it to notice.
clear=()
mode_file="$mobile/.expo/thinkering-ai-mode"
if [ "$(cat "$mode_file" 2>/dev/null)" != "$ai_mode" ]; then clear=(--clear); fi
mkdir -p "$(dirname "$mode_file")"
echo "$ai_mode" >"$mode_file"

running() {
  xcrun simctl spawn "$udid" launchctl list 2>/dev/null | grep -q "UIKitApplication:app.thinkering"
}

# Opens the app once Metro answers. It runs alongside Metro rather than the
# other way round: Metro stays the foreground process, so its output — build
# progress, errors, the app's logs — is this script's output, and Conductor's
# Stop reaches it directly instead of orphaning a backgrounded server on the port.
open_app() {
  for _ in $(seq 1 90); do
    curl -sf "http://localhost:$port/status" >/dev/null 2>&1 && break
    sleep 1
  done

  # A freshly booted simulator sometimes swallows the first open, so keep asking
  # until the app is actually running.
  for _ in 1 2 3 4 5; do
    running && return
    echo "==> opening the app against http://localhost:$port"
    xcrun simctl openurl "$udid" "thinkering://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$port" || true
    sleep 5
  done
  running || echo "The app didn't come up. Open it by hand from the simulator's home screen — the dev launcher remembers this URL." >&2
}
open_app &

echo "==> metro in $ai_mode mode"
EXPO_PUBLIC_AI_MODE="$ai_mode" exec npx expo start --dev-client --port "$port" ${clear[@]+"${clear[@]}"}
