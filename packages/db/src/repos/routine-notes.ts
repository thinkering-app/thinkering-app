import { and, asc, eq, isNull, or } from 'drizzle-orm'
import type { Database, RepoContext } from '../database'
import { routineNotes } from '../schema'

/**
 * Free-text routine customization (G11, docs/03). Notes accumulate: later
 * generation calls carry them as context, newest last.
 */

export type RoutineNote = typeof routineNotes.$inferSelect

/** The interest's notes plus the global ones (interest_id null), oldest first. */
export function listRoutineNotes(db: Database, interestId?: string): RoutineNote[] {
  const scope = interestId
    ? or(eq(routineNotes.interestId, interestId), isNull(routineNotes.interestId))
    : isNull(routineNotes.interestId)
  return db
    .select()
    .from(routineNotes)
    .where(and(scope, isNull(routineNotes.deletedAt)))
    .orderBy(asc(routineNotes.createdAt), asc(routineNotes.id))
    .all()
}

export function createRoutineNote(
  db: Database,
  ctx: RepoContext,
  input: { interestId?: string | null; note: string },
): RoutineNote {
  const now = ctx.now()
  const id = ctx.newId()
  db.insert(routineNotes)
    .values({ id, interestId: input.interestId ?? null, note: input.note, createdAt: now, updatedAt: now })
    .run()
  return db.select().from(routineNotes).where(eq(routineNotes.id, id)).get()!
}

export function softDeleteRoutineNote(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  db.update(routineNotes)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(routineNotes.id, id), isNull(routineNotes.deletedAt)))
    .run()
}
