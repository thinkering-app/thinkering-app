import { and, asc, eq, isNull } from 'drizzle-orm'
import type { TopicOrigin } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { topics } from '../schema'

export type Topic = typeof topics.$inferSelect

export interface NewTopic {
  interestId: string
  label: string
  /** `user` for topics typed in later (path settings); the rest come from G2. */
  origin: TopicOrigin
  selected: boolean
  sortOrder: number
}

export function createTopic(db: Database, ctx: RepoContext, input: NewTopic): Topic {
  const now = ctx.now()
  const id = ctx.newId()
  db.insert(topics)
    .values({
      id,
      interestId: input.interestId,
      label: input.label,
      origin: input.origin,
      selected: input.selected,
      sortOrder: input.sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return getTopic(db, id)!
}

export function getTopic(db: Database, id: string): Topic | undefined {
  return db
    .select()
    .from(topics)
    .where(and(eq(topics.id, id), isNull(topics.deletedAt)))
    .get()
}

/** The interest's live topics, in the order they were offered. */
export function listTopics(db: Database, interestId: string): Topic[] {
  return db
    .select()
    .from(topics)
    .where(and(eq(topics.interestId, interestId), isNull(topics.deletedAt)))
    .orderBy(asc(topics.sortOrder), asc(topics.id))
    .all()
}

export function setTopicSelected(db: Database, ctx: RepoContext, id: string, selected: boolean): void {
  db.update(topics)
    .set({ selected, updatedAt: ctx.now() })
    .where(and(eq(topics.id, id), isNull(topics.deletedAt)))
    .run()
}

export function softDeleteTopic(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  db.update(topics)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(topics.id, id), isNull(topics.deletedAt)))
    .run()
}
