import { and, asc, eq, isNull } from 'drizzle-orm'
import type { ConceptKind, GoalConcept, GoalSource, ReflectionChanges } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { goals, reflections } from '../schema'
import { createGoal, listGoals, softDeleteGoal } from './goals'

/**
 * Applying a reflection (docs/01 §5). The flow hands over the path the learner
 * accepted — the final ordered list of goals, existing and new — rather than a
 * stream of edits, so the write is one transaction and what they saw is what
 * lands.
 */

export type Reflection = typeof reflections.$inferSelect

export type ReflectionEntry =
  | { kind: 'existing'; goalId: string; title: string; description: string }
  | {
      kind: 'new'
      title: string
      description: string
      concepts: { label: string; kind: ConceptKind }[]
      /** `reflection` for a goal G8 proposed, `user` for one they typed. */
      source: Extract<GoalSource, 'reflection' | 'user'>
    }

export interface PathUpdate {
  interestId: string
  feelingText: string
  /** The path as the learner accepted it, in order. */
  entries: ReflectionEntry[]
  changes: ReflectionChanges
}

export function applyReflection(db: Database, ctx: RepoContext, update: PathUpdate): Reflection {
  return db.transaction((txRaw) => {
    const tx = txRaw as unknown as Database
    const now = ctx.now()
    const kept = new Set(update.entries.flatMap((e) => (e.kind === 'existing' ? [e.goalId] : [])))

    // Anything the learner dropped from the list is removed (soft, docs/03).
    for (const goal of listGoals(tx, update.interestId)) {
      if (!kept.has(goal.id)) softDeleteGoal(tx, ctx, goal.id)
    }

    // A reflection rewrites the whole path, so renumbering every row is honest
    // — fractional ordering exists for single moves, not for this.
    update.entries.forEach((entry, index) => {
      const sortOrder = index + 1
      if (entry.kind === 'existing') {
        tx.update(goals)
          .set({ title: entry.title, description: entry.description, sortOrder, updatedAt: now })
          .where(and(eq(goals.id, entry.goalId), isNull(goals.deletedAt)))
          .run()
        return
      }
      createGoal(tx, ctx, {
        interestId: update.interestId,
        title: entry.title,
        description: entry.description,
        concepts: entry.concepts.map<GoalConcept>((c) => ({
          id: ctx.newId(),
          label: c.label,
          kind: c.kind,
        })),
        sortOrder,
        source: entry.source,
      })
    })

    const id = ctx.newId()
    tx.insert(reflections)
      .values({
        id,
        interestId: update.interestId,
        feelingText: update.feelingText,
        changes: update.changes,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    return tx.select().from(reflections).where(eq(reflections.id, id)).get()!
  })
}

export function listReflections(db: Database, interestId: string): Reflection[] {
  return db
    .select()
    .from(reflections)
    .where(and(eq(reflections.interestId, interestId), isNull(reflections.deletedAt)))
    .orderBy(asc(reflections.createdAt))
    .all()
}
