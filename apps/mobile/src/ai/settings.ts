import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * AI mode (docs/02 §AI access): proxy (default) · byok · fixture. Fixture is a
 * first-class mode — the whole app deterministic, offline, zero token cost.
 */
export type AiMode = 'proxy' | 'byok' | 'fixture'

const AI_MODE_KEY = 'ai_mode'
const INSPECTOR_KEY = 'ai_inspector_enabled'

const AI_MODES: AiMode[] = ['proxy', 'byok', 'fixture']

/**
 * The mode before the user has chosen one. `EXPO_PUBLIC_AI_MODE=fixture` is how
 * a dev run or a Maestro flow (docs/10 Tier 6) starts in fixture mode — the Me
 * toggle isn't reachable until intake is done.
 */
const DEFAULT_MODE: AiMode =
  AI_MODES.find((m) => m === process.env.EXPO_PUBLIC_AI_MODE) ?? 'proxy'

export function getAiMode(): AiMode {
  return getSetting<AiMode>(db, AI_MODE_KEY) ?? DEFAULT_MODE
}

export function setAiMode(mode: AiMode): void {
  setSetting(db, AI_MODE_KEY, mode)
}

/** Inspector is always available in dev; production needs the hidden toggle. */
export function isInspectorEnabled(): boolean {
  return __DEV__ || (getSetting<boolean>(db, INSPECTOR_KEY) ?? false)
}

/**
 * Flips the stored flag behind the hidden long-press on About (docs/02) and
 * returns the new value. It reads the flag rather than `isInspectorEnabled`,
 * which is always true in dev and so would never flip.
 */
export function toggleInspectorEnabled(): boolean {
  const next = !(getSetting<boolean>(db, INSPECTOR_KEY) ?? false)
  setSetting(db, INSPECTOR_KEY, next)
  return next
}

/**
 * The API host, canonical form. `thinkering.app` 308-redirects to `www` — fine
 * for a native client, fatal in a browser, where a redirected CORS preflight is
 * rejected outright. Always point this at the host that answers directly.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.thinkering.app'
