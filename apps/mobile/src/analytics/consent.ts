import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * Anonymous analytics consent (D9, docs/08): opt-in, default off. Nothing is
 * transmitted until this is granted. Until the learner decides, the typed
 * `track()` wrapper buffers events locally; granting flushes that buffer,
 * declining deletes it and stops buffering — both in `@/analytics/track`,
 * which is where the decision should be written from.
 */

const OPT_IN_KEY = 'posthog_opt_in'
const DECIDED_KEY = 'posthog_consent_decided'

export type ConsentState = 'undecided' | 'granted' | 'denied'

export function getConsent(): ConsentState {
  if (getSetting<boolean>(db, OPT_IN_KEY) ?? false) return 'granted'
  return getSetting<boolean>(db, DECIDED_KEY) ? 'denied' : 'undecided'
}

export function isAnalyticsOptedIn(): boolean {
  return getConsent() === 'granted'
}

/** Whether the one-time ask still has to happen (docs/01 §7). */
export function isConsentUndecided(): boolean {
  return getConsent() === 'undecided'
}

/** State only — `setAnalyticsConsent` in `@/analytics/track` is the way in. */
export function writeConsent(optedIn: boolean): void {
  setSetting(db, OPT_IN_KEY, optedIn)
  setSetting(db, DECIDED_KEY, true)
}
