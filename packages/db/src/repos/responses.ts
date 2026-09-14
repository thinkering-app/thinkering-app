import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Database, RepoContext } from '../database'
import { responses } from '../schema'

export type Response = typeof responses.$inferSelect

/**
 * Responses save immediately on interaction (docs/05) — re-answering the same
 * block updates the existing live row rather than adding a second one.
 */
export function saveResponse(
  db: Database,
  ctx: RepoContext,
  input: { activityId: string; pageId: string; blockId: string; payload: unknown },
): Response {
  const now = ctx.now()
  const existing = db
    .select()
    .from(responses)
    .where(
      and(
        eq(responses.activityId, input.activityId),
        eq(responses.pageId, input.pageId),
        eq(responses.blockId, input.blockId),
        isNull(responses.deletedAt),
      ),
    )
    .get()

  if (existing) {
    db.update(responses)
      .set({ payload: input.payload, updatedAt: now })
      .where(eq(responses.id, existing.id))
      .run()
    return { ...existing, payload: input.payload, updatedAt: now }
  }

  const row: typeof responses.$inferInsert = {
    id: ctx.newId(),
    activityId: input.activityId,
    pageId: input.pageId,
    blockId: input.blockId,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  }
  db.insert(responses).values(row).run()
  return db.select().from(responses).where(eq(responses.id, row.id)).get()!
}

export function listResponses(db: Database, activityId: string): Response[] {
  return db
    .select()
    .from(responses)
    .where(and(eq(responses.activityId, activityId), isNull(responses.deletedAt)))
    .orderBy(asc(responses.createdAt), asc(responses.id))
    .all()
}
