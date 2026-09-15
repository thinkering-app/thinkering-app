import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * Anonymous analytics consent (D9, docs/08): opt-in, default off. Nothing is
 * transmitted until this is true. The typed `track()` wrapper and the
 * pre-consent buffer land in WP9.1; this is the setting they read.
 */

const POSTHOG_OPT_IN_KEY = 'posthog_opt_in'

export function isAnalyticsOptedIn(): boolean {
  return getSetting<boolean>(db, POSTHOG_OPT_IN_KEY) ?? false
}

export function setAnalyticsOptIn(optedIn: boolean): void {
  setSetting(db, POSTHOG_OPT_IN_KEY, optedIn)
}
