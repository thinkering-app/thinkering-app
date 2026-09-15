import { and, asc, eq, isNull } from 'drizzle-orm'
import type { ResourceSource } from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { resources } from '../schema'
import { listGoals } from './goals'

/**
 * Saved articles and videos for an interest (docs/01 §5): pasted by the learner
 * (G10 drafts the fields) or found by G4 after intake. Activity generation
 * reads them as context, so the summary matters more than the description.
 */

export type Resource = typeof resources.$inferSelect

export interface NewResource {
  interestId: string
  url: string
  title: string
  description?: string
  howToUse?: string | null
  /** For generation context only; never shown (docs/03). */
  summary?: string | null
  source: ResourceSource
  goalIds?: string[] | null
}

export function createResource(db: Database, ctx: RepoContext, input: NewResource): Resource {
  const now = ctx.now()
  const id = ctx.newId()
  db.insert(resources)
    .values({
      id,
      interestId: input.interestId,
      url: input.url,
      title: input.title,
      description: input.description ?? '',
      howToUse: input.howToUse ?? null,
      summary: input.summary ?? null,
      source: input.source,
      goalIds: input.goalIds ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return db.select().from(resources).where(eq(resources.id, id)).get()!
}

export function listResources(db: Database, interestId: string): Resource[] {
  return db
    .select()
    .from(resources)
    .where(and(eq(resources.interestId, interestId), isNull(resources.deletedAt)))
    .orderBy(asc(resources.createdAt), asc(resources.id))
    .all()
}

export function updateResource(
  db: Database,
  ctx: RepoContext,
  id: string,
  patch: Partial<Pick<Resource, 'title' | 'description' | 'howToUse' | 'summary' | 'goalIds'>>,
): void {
  db.update(resources)
    .set({ ...patch, updatedAt: ctx.now() })
    .where(and(eq(resources.id, id), isNull(resources.deletedAt)))
    .run()
}

export function softDeleteResource(db: Database, ctx: RepoContext, id: string): void {
  const now = ctx.now()
  db.update(resources)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(resources.id, id), isNull(resources.deletedAt)))
    .run()
}

/**
 * Resolves the goal titles a generation returned to goal ids. Titles the model
 * invented or misremembered are dropped rather than guessed at — a resource
 * attached to the wrong goal is worse than one attached to none.
 */
export function goalIdsForTitles(
  db: Database,
  interestId: string,
  titles: readonly string[],
): string[] {
  const byTitle = new Map(listGoals(db, interestId).map((g) => [normalize(g.title), g.id]))
  return titles.flatMap((title) => {
    const id = byTitle.get(normalize(title))
    return id ? [id] : []
  })
}

function normalize(title: string): string {
  return title.trim().toLowerCase()
}

/** Resources already matched to a goal, for the daily plan's item choice (docs/04 G5a). */
export function resourcesByGoal(
  db: Database,
  interestId: string,
): { goalId: string; resourceTitle: string }[] {
  return listResources(db, interestId).flatMap((r) =>
    (r.goalIds ?? []).map((goalId) => ({ goalId, resourceTitle: r.title })),
  )
}
