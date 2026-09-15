import { and, asc, eq, isNull } from 'drizzle-orm'
import type { ContextKind } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { contexts } from '../schema'

/**
 * Projects, environments and people attached to an interest (docs/03), edited
 * in path settings. Generation sees them for apply-tier activities only
 * (docs/04 §Context assembly), and only when they add something.
 */

export type Context = typeof contexts.$inferSelect

export interface NewContext {
  interestId: string
  kind: ContextKind
  label: string
  notes?: string | null
}

export function createContext(db: Database, ctx: RepoContext, input: NewContext): Context {
  const now = ctx.now()
  const id = ctx.newId()
  db.insert(contexts)
    .values({
      id,
      interestId: input.interestId,
      kind: input.kind,
      label: input.label,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return db.select().from(contexts).where(eq(contexts.id, id)).get()!
}

export function listContexts(db: Database, interestId: string): Context[] {
  return db
    .select()
    .from(contexts)
    .where(and(eq(contexts.interestId, interestId), isNull(contexts.deletedAt)))
    .orderBy(asc(contexts.createdAt), asc(contexts.id))
    .all()
}

export function updateContext(
  db: Database,
  ctx: RepoContext,
  id: string,
  patch: Partial<Pick<Context, 'kind' | 'label' | 'notes'>>,
): void {
  db.update(contexts)
    .set({ ...patch, updatedAt: ctx.now() })
    .where(and(eq(contexts.id, id), isNull(contexts.deletedAt)))
    .run()
}

export function softDeleteContext(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  db.update(contexts)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(contexts.id, id), isNull(contexts.deletedAt)))
    .run()
}
