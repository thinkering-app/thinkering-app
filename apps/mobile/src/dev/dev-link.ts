import { Platform } from 'react-native'
import { useEffect } from 'react'

import { enableInspector } from '@/ai/settings'
import { setAnalyticsConsent, setReplayConsent } from '@/analytics'

/**
 * `?dev` on any web URL — `thinkering.app/?dev`, `/dev/reset?dev&seed=1` — sets
 * the browser up for the team: anonymous analytics off, session replay off
 * (and its welcome ask answered), and Me → Settings → Developer on for the AI
 * Inspector. Each is a setting a learner can already change themselves, so the
 * link works in production builds too; it only saves the taps. Sticky, like
 * the toggles it stands in for.
 */
export function hasDevParam(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('dev')
}

export function applyDevSetup(): void {
  setAnalyticsConsent(false)
  setReplayConsent(false)
  enableInspector()
}

/**
 * Applies `?dev` once the schema is there. Called in the root layout ahead of
 * `useAppOpened`, whose effect then runs second and finds analytics already off.
 */
export function useDevLink(ready: boolean): void {
  useEffect(() => {
    if (ready && hasDevParam()) applyDevSetup()
  }, [ready])
}
