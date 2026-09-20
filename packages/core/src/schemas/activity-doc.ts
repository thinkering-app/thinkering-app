import { z } from 'zod'
import { extractJsonText } from '../streaming/json'
import { blockSchema, isInteractiveBlock } from './blocks'

/**
 * Activity Document, v1 (docs/05-activity-format.md, D5). Emitted by G5b, validated
 * here before it is ever stored or rendered, stored on `activities.doc`.
 */

export const activityDocConceptSchema = z.object({
  /** Links to the goal's concept for coverage (D16); absent for extras the doc introduces. */
  goalConceptId: z.string().optional(),
  label: z.string().min(1),
})

export const pageSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('content'),
    blocks: z.array(blockSchema).min(1),
  }),
  // Reserved near the end; blocks null until G6 fills it.
  z.object({
    id: z.string().min(1),
    kind: z.literal('review'),
    blocks: z.array(blockSchema).min(1).nullable(),
  }),
  // Last page; the renderer appends the rating UI.
  z.object({
    id: z.string().min(1),
    kind: z.literal('summary'),
    blocks: z.array(blockSchema).min(1),
  }),
  // Created by G7 (Ask); interaction optional.
  z.object({
    id: z.string().min(1),
    kind: z.literal('inserted'),
    blocks: z.array(blockSchema).min(1),
  }),
])

export type Page = z.infer<typeof pageSchema>

export const activityDocSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1),
    estMinutes: z.number().int().positive(),
    tier: z.enum(['introduce', 'strengthen', 'apply']),
    libraryItemId: z.string().min(1),
    concepts: z.array(activityDocConceptSchema).min(1),
    pages: z.array(pageSchema).min(3),
  })
  .superRefine((doc, ctx) => {
    const reviewIndexes = doc.pages.flatMap((p, i) => (p.kind === 'review' ? [i] : []))
    const summaryIndexes = doc.pages.flatMap((p, i) => (p.kind === 'summary' ? [i] : []))

    if (reviewIndexes.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['pages'],
        message: `expected exactly one review page, got ${reviewIndexes.length}`,
      })
    }
    if (summaryIndexes.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['pages'],
        message: `expected exactly one summary page, got ${summaryIndexes.length}`,
      })
    }
    if (summaryIndexes.length === 1 && summaryIndexes[0] !== doc.pages.length - 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['pages', summaryIndexes[0]!],
        message: 'summary page must be last',
      })
    }
    // The review page is second-to-last among original pages; inserted pages (G7) may
    // legitimately land between review and summary after the fact, so only require
    // review-before-summary plus nothing but inserted pages between them.
    if (reviewIndexes.length === 1 && summaryIndexes.length === 1) {
      const [r, s] = [reviewIndexes[0]!, summaryIndexes[0]!]
      if (r > s) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages', r],
          message: 'review page must come before the summary page',
        })
      } else {
        for (let i = r + 1; i < s; i++) {
          if (doc.pages[i]!.kind !== 'inserted') {
            ctx.addIssue({
              code: 'custom',
              path: ['pages', i],
              message: 'only inserted (Ask) pages may sit between the review and summary pages',
            })
          }
        }
      }
    }

    const pageIds = new Set<string>()
    for (const [i, page] of doc.pages.entries()) {
      if (pageIds.has(page.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages', i, 'id'],
          message: `duplicate page id "${page.id}"`,
        })
      }
      pageIds.add(page.id)
      // Every content page includes at least one interactive block (docs/05 rules;
      // review is G6-filled feedback, summary is a recap, inserted interaction is optional).
      if (page.kind === 'content' && !page.blocks.some(isInteractiveBlock)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages', i],
          message: `content page "${page.id}" has no interactive block`,
        })
      }
    }
  })

export type ActivityDoc = z.infer<typeof activityDocSchema>

export type ActivityDocIssue = { path: string; message: string }

export type ParseActivityDocResult =
  { ok: true; doc: ActivityDoc } | { ok: false; issues: ActivityDocIssue[] }

/**
 * The full validation boundary for model-emitted Activity Documents: JSON parse (when
 * given a string), schema + structural rules, and — when the goal's concepts are
 * provided — that every `goalConceptId` the doc declares actually exists on the goal.
 * Nothing that fails here may be stored or rendered.
 */
export function parseActivityDoc(
  input: unknown,
  opts: { goalConceptIds?: readonly string[] } = {},
): ParseActivityDocResult {
  let value = input
  if (typeof value === 'string') {
    try {
      value = JSON.parse(extractJsonText(value))
    } catch (e) {
      return { ok: false, issues: [{ path: '', message: `invalid JSON: ${(e as Error).message}` }] }
    }
  }

  const parsed = activityDocSchema.safeParse(value)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    }
  }

  if (opts.goalConceptIds) {
    const known = new Set(opts.goalConceptIds)
    const issues: ActivityDocIssue[] = []
    for (const [i, c] of parsed.data.concepts.entries()) {
      if (c.goalConceptId !== undefined && !known.has(c.goalConceptId)) {
        issues.push({
          path: `concepts.${i}.goalConceptId`,
          message: `goalConceptId "${c.goalConceptId}" does not exist on the goal`,
        })
      }
    }
    if (issues.length > 0) return { ok: false, issues }
  }

  return { ok: true, doc: parsed.data }
}
