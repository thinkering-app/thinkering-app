import { and, eq, isNull } from 'drizzle-orm'
import type { LibraryPref, Section } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { libraryPrefs } from '../schema'

/**
 * Per-interest activation of library items (docs/03). An absent row means the
 * item's default activation, so only deliberate choices are stored — resolving
 * a row set into the active set is `activeLibraryItems` in packages/core.
 */

export function listLibraryPrefs(db: Database, interestId: string): LibraryPref[] {
  return db
    .select()
    .from(libraryPrefs)
    .where(and(eq(libraryPrefs.interestId, interestId), isNull(libraryPrefs.deletedAt)))
    .all()
    .map((row) => ({ section: row.section, libraryItemId: row.libraryItemId, active: row.active }))
}

export function setLibraryPref(
  db: Database,
  ctx: RepoContext,
  input: { interestId: string; section: Section; libraryItemId: string; active: boolean },
): void {
  const existing = db
    .select()
    .from(libraryPrefs)
    .where(
      and(
        eq(libraryPrefs.interestId, input.interestId),
        eq(libraryPrefs.section, input.section),
        eq(libraryPrefs.libraryItemId, input.libraryItemId),
        isNull(libraryPrefs.deletedAt),
      ),
    )
    .get()
  const now = ctx.now()
  if (existing) {
    db.update(libraryPrefs)
      .set({ active: input.active, updatedAt: now })
      .where(eq(libraryPrefs.id, existing.id))
      .run()
    return
  }
  db.insert(libraryPrefs)
    .values({
      id: ctx.newId(),
      interestId: input.interestId,
      section: input.section,
      libraryItemId: input.libraryItemId,
      active: input.active,
      updatedAt: now,
    })
    .run()
}
