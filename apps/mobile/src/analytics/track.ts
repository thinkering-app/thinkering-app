import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AnalyticsValue,
  type NoProperties,
} from '@thinkering/core'
import { getSetting, setSetting } from '@thinkering/db'
import { db, repoContext } from '@/db'
import { analyticsClient, isAnalyticsConfigured } from './client'
import { isAnalyticsOptedIn } from './consent'

/**
 * The one way the app emits telemetry (docs/08). Its type *is* the event
 * schema, so a stray `posthog.capture` is the only way to send something
 * undeclared — and there aren't any. Properties are sanitized against the
 * schema's allowlist before they go anywhere.
 *
 * On by default (D9): sent to PostHog unless the learner turned it off, in
 * which case it's dropped. Nothing here throws: analytics must never be the
 * reason a screen fails.
 */

/** Events with no properties may be tracked with one argument. */
type TrackArgs<N extends AnalyticsEventName> =
  AnalyticsProperties<N> extends NoProperties
    ? [properties?: NoProperties]
    : [properties: AnalyticsProperties<N>]

export function track<N extends AnalyticsEventName>(event: N, ...args: TrackArgs<N>): void {
  try {
    if (!isAnalyticsConfigured() || !isAnalyticsOptedIn()) return
    const properties = sanitizeAnalyticsProperties(event, args[0] ?? {})
    analyticsClient()?.capture(event, withoutIp(properties))
  } catch {
    // Telemetry is never worth an exception on a user's screen.
  }
}

/**
 * `$ip: null` tells PostHog not to record the request's IP address at all —
 * `disableGeoip` only suppresses the lookup, the address would still land in
 * the event. Every capture carries it (docs/08).
 */
function withoutIp(
  properties: Record<string, AnalyticsValue>,
): Record<string, AnalyticsValue | null> {
  return { ...properties, $ip: null }
}

const INSTALLED_AT_KEY = 'installed_at'

/** First-launch timestamp, for `days_since_install`. Written once, never sent raw. */
export function installedAt(): number {
  const stored = getSetting<number>(db, INSTALLED_AT_KEY)
  if (typeof stored === 'number') return stored
  const now = repoContext.now()
  setSetting(db, INSTALLED_AT_KEY, now)
  return now
}
