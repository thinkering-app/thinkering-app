import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * Anonymous analytics consent (D9, docs/08): on by default, off with one tap
 * in Me → Settings → Account and data, and described on the privacy page.
 * Only an explicit no is stored; a learner who never touched the toggle is on.
 * Session replay is a separate opt-in, default off (`./replay`).
 */

const OPT_IN_KEY = 'posthog_opt_in'

export function isAnalyticsOptedIn(): boolean {
  return getSetting<boolean>(db, OPT_IN_KEY) ?? true
}

export function setAnalyticsConsent(optedIn: boolean): void {
  setSetting(db, OPT_IN_KEY, optedIn)
}
