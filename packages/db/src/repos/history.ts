import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte } from 'drizzle-orm'
import type { Section, Tier } from '@thinkering/core'
import type { Database } from '../database'
import { activities, goals } from '../schema'

/**
 * History (docs/01 §6) and the Me calendar (§7) read the same shape: a
 * completed activity with the title of the goal it targeted, so `outcomeLine`
 * can render without a second query per row.
 */

export interface HistoryRow {
  id: string
  interestId: string
  section: Section
  tier: Tier
  libraryItemId: string
  title: string
  estMinutes: number
  completedAt: number
  goalId: string | null
  /** Null when the goal was deleted, or for the prerequisite card that has a `topic` instead. */
  goalTitle: string | null
  topic: string | null
}

const COLUMNS = {
  id: activities.id,
  interestId: activities.interestId,
  section: activities.section,
  tier: activities.tier,
  libraryItemId: activities.libraryItemId,
  title: activities.title,
  estMinutes: activities.estMinutes,
  completedAt: activities.completedAt,
  goalId: activities.goalId,
  goalTitle: goals.title,
  topic: activities.topic,
}

const COMPLETED = [
  eq(activities.status, 'completed'),
  isNotNull(activities.completedAt),
  isNull(activities.deletedAt),
]

/** Explore → All covers several interests at once (docs/01 §2); undefined means every interest. */
function interestFilter(interestIds: string[] | undefined) {
  return interestIds === undefined ? [] : [inArray(activities.interestId, interestIds)]
}

function rows(query: {
  all: () => (Omit<HistoryRow, 'completedAt'> & { completedAt: number | null })[]
}): HistoryRow[] {
  return query.all().filter((row): row is HistoryRow => row.completedAt !== null)
}

/**
 * A page of completed activities, newest first, keyset-paginated on
 * `completed_at` — History loads the recent days and pages on scroll.
 */
export function listHistoryPage(
  db: Database,
  opts: { interestIds?: string[]; beforeCompletedAt?: number; limit: number },
): HistoryRow[] {
  const conditions = [...COMPLETED, ...interestFilter(opts.interestIds)]
  if (opts.beforeCompletedAt !== undefined) {
    conditions.push(lt(activities.completedAt, opts.beforeCompletedAt))
  }
  return rows(
    db
      .select(COLUMNS)
      .from(activities)
      .leftJoin(goals, eq(goals.id, activities.goalId))
      .where(and(...conditions))
      .orderBy(desc(activities.completedAt))
      .limit(opts.limit),
  )
}

/** Everything completed in an instant range — the calendar's month of marks and its day detail. */
export function listCompletedBetween(
  db: Database,
  opts: { interestIds?: string[]; fromMs: number; toMs: number },
): HistoryRow[] {
  return rows(
    db
      .select(COLUMNS)
      .from(activities)
      .leftJoin(goals, eq(goals.id, activities.goalId))
      .where(
        and(
          ...COMPLETED,
          ...interestFilter(opts.interestIds),
          gte(activities.completedAt, opts.fromMs),
          lte(activities.completedAt, opts.toMs),
        ),
      )
      .orderBy(desc(activities.completedAt)),
  )
}
