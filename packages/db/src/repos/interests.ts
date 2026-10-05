import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  respreadSortOrders,
  type ApproachBrief,
  type ExperienceChoice,
  type Frequency,
  type InterestStatus,
  type ReadingAmount,
  type WhyChoice,
} from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import {
  activities,
  contexts,
  goals,
  interests,
  libraryPrefs,
  reflections,
  resources,
  responses,
  routineNotes,
  topics,
} from '../schema'

export interface NewInterest {
  name: string
  wantToLearn: string
  whyChoice: WhyChoice
  whyText?: string | null
  experienceChoice: ExperienceChoice
  experienceText?: string | null
  successOutcomes?: string[] | null
  frequency: Frequency
  sessionMinutes: number
  readingAmount?: ReadingAmount
  approachNotes?: string
  approachBrief?: ApproachBrief | null
  status: InterestStatus
  sortOrder: number
}

export type Interest = typeof interests.$inferSelect

export function createInterest(db: Database, ctx: RepoContext, input: NewInterest): Interest {
  const now = ctx.now()
  const row: typeof interests.$inferInsert = {
    id: ctx.newId(),
    name: input.name,
    wantToLearn: input.wantToLearn,
    whyChoice: input.whyChoice,
    whyText: input.whyText ?? null,
    experienceChoice: input.experienceChoice,
    experienceText: input.experienceText ?? null,
    successOutcomes: input.successOutcomes ?? null,
    frequency: input.frequency,
    sessionMinutes: input.sessionMinutes,
    readingAmount: input.readingAmount ?? 'balanced',
    approachNotes: input.approachNotes ?? '',
    approachBrief: input.approachBrief ?? null,
    status: input.status,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(interests).values(row).run()
  return getInterest(db, row.id)!
}

export function getInterest(db: Database, id: string): Interest | undefined {
  return db
    .select()
    .from(interests)
    .where(and(eq(interests.id, id), isNull(interests.deletedAt)))
    .get()
}

export function listInterests(db: Database): Interest[] {
  return db
    .select()
    .from(interests)
    .where(isNull(interests.deletedAt))
    .orderBy(asc(interests.sortOrder), asc(interests.id))
    .all()
}

/**
 * Manage Interests (docs/01 §7) hands back the order it shows, so the whole
 * visible list is renumbered in one go — the list is 1–10 rows, not a path.
 */
export function reorderInterests(db: Database, ctx: RepoContext, orderedIds: string[]): void {
  const now = ctx.now()
  const orders = respreadSortOrders(orderedIds.length)
  db.transaction((tx) => {
    for (const [index, id] of orderedIds.entries()) {
      tx.update(interests)
        .set({ sortOrder: orders[index]!, updatedAt: now })
        .where(and(eq(interests.id, id), isNull(interests.deletedAt)))
        .run()
    }
  })
}

export type InterestPatch = Partial<Omit<Interest, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>

export function updateInterest(
  db: Database,
  ctx: RepoContext,
  id: string,
  patch: InterestPatch,
): void {
  db.update(interests)
    .set({ ...patch, updatedAt: ctx.now() })
    .where(and(eq(interests.id, id), isNull(interests.deletedAt)))
    .run()
}

/**
 * Soft-deletes an interest and all its children (docs/03 invariants: cascade in
 * application code; never hard-delete synced rows).
 */
export function softDeleteInterest(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  const tombstone = { deletedAt: now, updatedAt: now }

  const activityIds = db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.interestId, id), isNull(activities.deletedAt)))
    .all()
    .map((r) => r.id)
  for (const activityId of activityIds) {
    db.update(responses)
      .set(tombstone)
      .where(and(eq(responses.activityId, activityId), isNull(responses.deletedAt)))
      .run()
  }

  db.update(topics)
    .set(tombstone)
    .where(and(eq(topics.interestId, id), isNull(topics.deletedAt)))
    .run()
  db.update(goals)
    .set(tombstone)
    .where(and(eq(goals.interestId, id), isNull(goals.deletedAt)))
    .run()
  db.update(activities)
    .set(tombstone)
    .where(and(eq(activities.interestId, id), isNull(activities.deletedAt)))
    .run()
  db.update(resources)
    .set(tombstone)
    .where(and(eq(resources.interestId, id), isNull(resources.deletedAt)))
    .run()
  db.update(contexts)
    .set(tombstone)
    .where(and(eq(contexts.interestId, id), isNull(contexts.deletedAt)))
    .run()
  db.update(reflections)
    .set(tombstone)
    .where(and(eq(reflections.interestId, id), isNull(reflections.deletedAt)))
    .run()
  db.update(routineNotes)
    .set(tombstone)
    .where(and(eq(routineNotes.interestId, id), isNull(routineNotes.deletedAt)))
    .run()
  db.update(libraryPrefs)
    .set(tombstone)
    .where(and(eq(libraryPrefs.interestId, id), isNull(libraryPrefs.deletedAt)))
    .run()

  db.update(interests)
    .set(tombstone)
    .where(and(eq(interests.id, id), isNull(interests.deletedAt)))
    .run()
}
