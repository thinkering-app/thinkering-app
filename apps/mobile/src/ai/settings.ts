import { getSetting, setSetting } from '@thinkering/db'
import { Platform } from 'react-native'
import { db } from '@/db'

/**
 * AI mode (docs/02 §AI access): proxy · byok · fixture. Fixture is a
 * first-class mode — the whole app deterministic, offline, zero token cost —
 * and the default for dev builds; release builds default to proxy.
 */
export type AiMode = 'proxy' | 'byok' | 'fixture'

const AI_MODE_KEY = 'ai_mode'
const INSPECTOR_KEY = 'ai_inspector_enabled'

/**
 * A BYO key is native-only. A browser has no keychain, so the key would sit in
 * localStorage where any script on the page can read it, and a direct call
 * sends it from the page itself. Web builds use the proxy instead.
 */
export const BYOK_AVAILABLE: boolean = Platform.OS !== 'web'

export const AI_MODES: AiMode[] = BYOK_AVAILABLE
  ? ['proxy', 'byok', 'fixture']
  : ['proxy', 'fixture']

/**
 * The mode baked into the bundle, and the mode before the user has chosen one.
 * `EXPO_PUBLIC_AI_MODE` picks it — the run scripts set it, and the e2e EAS
 * profile sets `fixture` for Maestro (docs/10 Tier 6) — since the Me toggle
 * isn't reachable until intake is done. Unset, a dev build starts in fixture
 * mode, so running the app from a fresh checkout never spends tokens; release
 * builds leave it unset and start in proxy mode.
 */
export const BUILD_AI_MODE: AiMode =
  AI_MODES.find((m) => m === process.env.EXPO_PUBLIC_AI_MODE) ?? (__DEV__ ? 'fixture' : 'proxy')

/**
 * Whether the build carries the developer tools: Me → Developer (AI mode
 * switch, load and clear data) and the `dev/seed` and `dev/reset` links. On in
 * dev, in a fixture-mode build (the `e2e` profile, the local web export), and
 * wherever `EXPO_PUBLIC_DEV_TOOLS=true` — the run scripts set it so a proxy-mode
 * web export keeps them. All three are fixed at bundle time and unset in the
 * production and preview profiles, so a store build never has them. Gated on
 * the build rather than on `getAiMode()`, which reads device state an earlier
 * dev install may have left behind.
 */
export const DEV_TOOLS: boolean =
  __DEV__ || BUILD_AI_MODE === 'fixture' || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true'

/** A `byok` left over from before web lost it (or baked into a web bundle) reads as proxy. */
export function getAiMode(): AiMode {
  const mode = getSetting<AiMode>(db, AI_MODE_KEY) ?? BUILD_AI_MODE
  return mode === 'byok' && !BYOK_AVAILABLE ? 'proxy' : mode
}

export function setAiMode(mode: AiMode): void {
  setSetting(db, AI_MODE_KEY, mode)
}

/** Inspector is always available with dev tools; production needs the hidden toggle. */
export function isInspectorEnabled(): boolean {
  return DEV_TOOLS || (getSetting<boolean>(db, INSPECTOR_KEY) ?? false)
}

/**
 * Flips the stored flag behind the hidden long-press on About (docs/02) and
 * returns the new value. It reads the flag rather than `isInspectorEnabled`,
 * which is always true with dev tools and so would never flip.
 */
export function toggleInspectorEnabled(): boolean {
  const next = !(getSetting<boolean>(db, INSPECTOR_KEY) ?? false)
  setSetting(db, INSPECTOR_KEY, next)
  return next
}

/** Turns the stored flag on, as the `?dev` web link does (`@/dev/dev-link`). */
export function enableInspector(): void {
  setSetting(db, INSPECTOR_KEY, true)
}

/**
 * The API host, canonical form. `thinkering.app` 308-redirects to `www` — fine
 * for a native client, fatal in a browser, where a redirected CORS preflight is
 * rejected outright. Always point this at the host that answers directly.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.thinkering.app'
