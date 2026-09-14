import { and, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import type { ActivityDoc, LocalDate, Rating, Section, Tier } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { activities } from '../schema'
import { recordGoalTierCompletion } from './goals'

export type Activity = typeof activities.$inferSelect

export interface NewActivity {
  interestId: string
  goalId?: string | null
  section: Section
  tier: Tier
  libraryItemId: string
  title: string
  estMinutes: number
  plannedFor: LocalDate
  doc?: ActivityDoc | null
}

export function createActivity(db: Database, ctx: RepoContext, input: NewActivity): Activity {
  const now = ctx.now()
  const row: typeof activities.$inferInsert = {
    id: ctx.newId(),
    interestId: input.interestId,
    goalId: input.goalId ?? null,
    section: input.section,
    tier: input.tier,
    libraryItemId: input.libraryItemId,
    title: input.title,
    estMinutes: input.estMinutes,
    doc: input.doc ?? null,
    status: input.doc ? 'ready' : 'planned',
    plannedFor: input.plannedFor,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(activities).values(row).run()
  return getActivity(db, row.id)!
}

export function getActivity(db: Database, id: string): Activity | undefined {
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
    .get()
}

/** Stores a validated Activity Document (G5b / G6 / G7 updates) and marks it ready if still planned. */
export function attachDoc(db: Database, ctx: RepoContext, id: string, doc: ActivityDoc): void {
  const current = getActivity(db, id)
  if (!current) return
  db.update(activities)
    .set({
      doc,
      status: current.status === 'planned' ? 'ready' : current.status,
      updatedAt: ctx.now(),
    })
    .where(eq(activities.id, id))
    .run()
}

export function startActivity(db: Database, ctx: RepoContext, id: string): void {
  const current = getActivity(db, id)
  if (!current) return
  const now = ctx.now()
  db.update(activities)
    .set({ status: 'in_progress', startedAt: current.startedAt ?? now, updatedAt: now })
    .where(eq(activities.id, id))
    .run()
}

/** Persists the resume point (docs/05). */
export function saveProgress(db: Database, ctx: RepoContext, id: string, currentPage: number): void {
  db.update(activities)
    .set({ currentPage, updatedAt: ctx.now() })
    .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
    .run()
}

/**
 * Completion (docs/05): sets status/completed_at and applies the goal status
 * transition for the activity's tier.
 */
export function completeActivity(db: Database, ctx: RepoContext, id: string): void {
  const current = getActivity(db, id)
  if (!current || current.status === 'completed') return
  const now = ctx.now()
  db.update(activities)
    .set({ status: 'completed', completedAt: now, updatedAt: now })
    .where(eq(activities.id, id))
    .run()
  if (current.goalId) recordGoalTierCompletion(db, ctx, current.goalId, current.tier)
}

export function rateActivity(
  db: Database,
  ctx: RepoContext,
  id: string,
  rating: Rating,
  ratingText?: string,
): void {
  db.update(activities)
    .set({ rating, ratingText: ratingText ?? null, updatedAt: ctx.now() })
    .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
    .run()
}

export function abandonActivity(db: Database, ctx: RepoContext, id: string): void {
  db.update(activities)
    .set({ status: 'abandoned', updatedAt: ctx.now() })
    .where(and(eq(activities.id, id), isNull(activities.deletedAt)))
    .run()
}

/** The day's plan for an interest (one planned set per interest per local date, docs/03). */
export function listPlannedForDate(db: Database, interestId: string, plannedFor: LocalDate): Activity[] {
  return db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.interestId, interestId),
        eq(activities.plannedFor, plannedFor),
        isNull(activities.deletedAt),
      ),
    )
    .all()
}

/**
 * History: completed activities, newest first, keyset-paginated by `completed_at`
 * (docs/01 §6 loads ~5 recent days then pages).
 */
export function listHistory(
  db: Database,
  opts: { interestId?: string; beforeCompletedAt?: number; limit?: number } = {},
): Activity[] {
  const conditions = [
    eq(activities.status, 'completed'),
    isNotNull(activities.completedAt),
    isNull(activities.deletedAt),
  ]
  if (opts.interestId !== undefined) conditions.push(eq(activities.interestId, opts.interestId))
  if (opts.beforeCompletedAt !== undefined) conditions.push(lt(activities.completedAt, opts.beforeCompletedAt))
  return db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.completedAt))
    .limit(opts.limit ?? 50)
    .all()
}
