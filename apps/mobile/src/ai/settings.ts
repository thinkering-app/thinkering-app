import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * AI mode (docs/02 §AI access): proxy (default) · byok · fixture. Fixture is a
 * first-class mode — the whole app deterministic, offline, zero token cost.
 */
export type AiMode = 'proxy' | 'byok' | 'fixture'

const AI_MODE_KEY = 'ai_mode'
const INSPECTOR_KEY = 'ai_inspector_enabled'

export function getAiMode(): AiMode {
  return getSetting<AiMode>(db, AI_MODE_KEY) ?? 'proxy'
}

export function setAiMode(mode: AiMode): void {
  setSetting(db, AI_MODE_KEY, mode)
}

/** Inspector is always available in dev; production needs the hidden toggle. */
export function isInspectorEnabled(): boolean {
  return __DEV__ || (getSetting<boolean>(db, INSPECTOR_KEY) ?? false)
}

export function setInspectorEnabled(enabled: boolean): void {
  setSetting(db, INSPECTOR_KEY, enabled)
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://thinkering.app'
