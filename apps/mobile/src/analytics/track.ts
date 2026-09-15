import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AnalyticsValue,
  type NoProperties,
} from '@thinkering/core'
import {
  bufferAnalyticsEvent,
  clearAnalyticsBuffer,
  listBufferedEvents,
  getSetting,
  setSetting,
} from '@thinkering/db'
import { db, repoContext } from '@/db'
import { analyticsClient, isAnalyticsConfigured } from './client'
import { getConsent, writeConsent } from './consent'

/**
 * The one way the app emits telemetry (docs/08). Its type *is* the event
 * schema, so a stray `posthog.capture` is the only way to send something
 * undeclared — and there aren't any. Properties are sanitized against the
 * schema's allowlist before they go anywhere, including into the buffer.
 *
 * Consent decides the destination: granted → PostHog, undecided → the local
 * pre-consent buffer, denied → dropped. Nothing here throws: analytics must
 * never be the reason a screen fails.
 */

/** Events with no properties may be tracked with one argument. */
type TrackArgs<N extends AnalyticsEventName> =
  AnalyticsProperties<N> extends NoProperties ? [properties?: NoProperties] : [properties: AnalyticsProperties<N>]

export function track<N extends AnalyticsEventName>(event: N, ...args: TrackArgs<N>): void {
  try {
    const properties = sanitizeAnalyticsProperties(event, args[0] ?? {})
    switch (getConsent()) {
      case 'granted':
        analyticsClient()?.capture(event, withoutIp(properties))
        return
      case 'undecided':
        bufferAnalyticsEvent(db, repoContext, { event, properties })
        return
      case 'denied':
        return
    }
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

/**
 * Records the learner's answer to the analytics ask and acts on it: a yes
 * flushes the buffered events with their original timestamps, a no deletes
 * them. Either way buffering stops.
 */
export function setAnalyticsConsent(granted: boolean): void {
  writeConsent(granted)
  try {
    if (!granted) {
      clearAnalyticsBuffer(db)
      return
    }
    flushBuffer()
  } catch {
    // A failed flush costs a handful of early events, not the opt-in.
  }
}

function flushBuffer(): void {
  const buffered = listBufferedEvents(db)
  // Clear first: a duplicate send is worse than a lost one, and the rows are
  // only useful until they reach PostHog.
  clearAnalyticsBuffer(db)
  if (!isAnalyticsConfigured()) return
  const client = analyticsClient()
  if (!client) return
  for (const row of buffered) {
    client.capture(row.event, withoutIp(row.properties), { timestamp: new Date(row.createdAt) })
  }
  void client.flush().catch(() => {})
}
