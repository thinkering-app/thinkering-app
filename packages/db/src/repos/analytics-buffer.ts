import { asc, sql } from 'drizzle-orm'
import type { AnalyticsValue } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { analyticsBuffer } from '../schema'

/**
 * The pre-consent analytics buffer (D9, docs/08). From first launch the typed
 * `track()` wrapper writes here instead of to PostHog, so a learner who opts in
 * later still contributes their first intake and first activity. On opt-in the
 * buffer is flushed with its original timestamps; on decline it is deleted and
 * buffering stops. Local only, never synced.
 *
 * The cap is "the first week, or 300 events, whichever comes first": once the
 * window closes the buffer keeps what it has and stops taking more, because the
 * early events are the ones worth keeping.
 */

export type BufferedEvent = typeof analyticsBuffer.$inferSelect

export const BUFFER_MAX_EVENTS = 300
export const BUFFER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export interface NewBufferedEvent {
  event: string
  properties: Record<string, AnalyticsValue>
}

/** Buffers an event unless the window has closed. Returns whether it was kept. */
export function bufferAnalyticsEvent(
  db: Database,
  ctx: RepoContext,
  input: NewBufferedEvent,
): boolean {
  const now = ctx.now()
  const stats = db
    .select({
      count: sql<number>`count(*)`,
      firstAt: sql<number | null>`min(${analyticsBuffer.createdAt})`,
    })
    .from(analyticsBuffer)
    .get()
  const count = stats?.count ?? 0
  const firstAt = stats?.firstAt ?? null
  if (count >= BUFFER_MAX_EVENTS) return false
  if (firstAt !== null && now - firstAt > BUFFER_WINDOW_MS) return false

  db.insert(analyticsBuffer)
    .values({
      id: ctx.newId(),
      event: input.event,
      properties: input.properties,
      createdAt: now,
    })
    .run()
  return true
}

/** Oldest first — flushing preserves the order the events happened in. */
export function listBufferedEvents(db: Database): BufferedEvent[] {
  return db
    .select()
    .from(analyticsBuffer)
    .orderBy(asc(analyticsBuffer.createdAt), asc(analyticsBuffer.id))
    .all()
}

export function countBufferedEvents(db: Database): number {
  return db.select({ count: sql<number>`count(*)` }).from(analyticsBuffer).get()?.count ?? 0
}

export function clearAnalyticsBuffer(db: Database): void {
  db.delete(analyticsBuffer).run()
}
