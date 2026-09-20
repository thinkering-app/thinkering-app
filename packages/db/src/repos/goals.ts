import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  advanceGoalStatus,
  respreadSortOrders,
  sortOrderBetween,
  type GoalConcept,
  type GoalSource,
  type SchedulerGoal,
  type Tier,
} from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { goals } from '../schema'

export type Goal = typeof goals.$inferSelect

export interface NewGoal {
  interestId: string
  title: string
  description: string
  concepts: GoalConcept[]
  sortOrder: number
  source: GoalSource
}

export function createGoal(db: Database, ctx: RepoContext, input: NewGoal): Goal {
  const now = ctx.now()
  const row: typeof goals.$inferInsert = {
    id: ctx.newId(),
    interestId: input.interestId,
    title: input.title,
    description: input.description,
    concepts: input.concepts,
    status: 'not_started',
    sortOrder: input.sortOrder,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(goals).values(row).run()
  return getGoal(db, row.id)!
}

export function getGoal(db: Database, id: string): Goal | undefined {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
    .get()
}

/** The interest's live goals in path order. */
export function listGoals(db: Database, interestId: string): Goal[] {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.interestId, interestId), isNull(goals.deletedAt)))
    .orderBy(asc(goals.sortOrder), asc(goals.id))
    .all()
}

/** Appends to the end of the path — where a suggestion or a user-added goal lands. */
export function nextGoalSortOrder(db: Database, interestId: string): number {
  const orders = listGoals(db, interestId).map((g) => g.sortOrder)
  return orders.length === 0 ? 1 : Math.max(...orders) + 1
}

/**
 * Moves a goal to `targetIndex` in path order (docs/01 §5 reorder). One row
 * changes, via a fractional order between its new neighbours; if midpoints have
 * exhausted double precision, the whole path is renumbered instead.
 */
export function moveGoal(
  db: Database,
  ctx: RepoContext,
  goalId: string,
  targetIndex: number,
): void {
  const goal = getGoal(db, goalId)
  if (!goal) return
  const path = listGoals(db, goal.interestId)
  const without = path.filter((g) => g.id !== goalId)
  const index = Math.max(0, Math.min(targetIndex, without.length))
  const order = sortOrderBetween(
    without[index - 1]?.sortOrder ?? null,
    without[index]?.sortOrder ?? null,
  )
  const now = ctx.now()
  if (order === null) {
    const reordered = [...without.slice(0, index), goal, ...without.slice(index)]
    const spread = respreadSortOrders(reordered.length)
    for (const [i, row] of reordered.entries()) {
      db.update(goals)
        .set({ sortOrder: spread[i]!, updatedAt: now })
        .where(eq(goals.id, row.id))
        .run()
    }
    return
  }
  db.update(goals).set({ sortOrder: order, updatedAt: now }).where(eq(goals.id, goalId)).run()
}

export type GoalPatch = Partial<Pick<Goal, 'title' | 'description' | 'concepts' | 'sortOrder'>>

export function updateGoal(db: Database, ctx: RepoContext, id: string, patch: GoalPatch): void {
  db.update(goals)
    .set({ ...patch, updatedAt: ctx.now() })
    .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
    .run()
}

export function softDeleteGoal(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  db.update(goals)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
    .run()
}

/**
 * Applies a completed activity of `tier` to the goal (docs/03 invariants): status
 * only moves forward via advanceGoalStatus; the tier's timestamp records the most
 * recent completion of that tier (spaced review orders by it), so it always updates.
 */
export function recordGoalTierCompletion(
  db: Database,
  ctx: RepoContext,
  goalId: string,
  tier: Tier,
): void {
  const goal = getGoal(db, goalId)
  if (!goal) return
  const now = ctx.now()
  const tierStamp =
    tier === 'introduce'
      ? { introducedAt: now }
      : tier === 'strengthen'
        ? { strengthenedAt: now }
        : { appliedAt: now }
  db.update(goals)
    .set({ status: advanceGoalStatus(goal.status, tier), ...tierStamp, updatedAt: now })
    .where(eq(goals.id, goalId))
    .run()
}

/** Projection for the deterministic scheduler (packages/core). */
export function schedulerGoals(db: Database, interestId: string): SchedulerGoal[] {
  return listGoals(db, interestId).map((g) => ({
    id: g.id,
    status: g.status,
    sortOrder: g.sortOrder,
    introducedAt: g.introducedAt,
    strengthenedAt: g.strengthenedAt,
    appliedAt: g.appliedAt,
  }))
}
