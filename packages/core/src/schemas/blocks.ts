import { z } from 'zod'

/**
 * Activity Document block types, v1 (docs/05-activity-format.md).
 * `md` fields carry an inline markdown subset: bold, italic, code.
 */

const md = z.string().min(1)

// Content blocks

export const headingBlockSchema = z.object({
  kind: z.literal('heading'),
  text: z.string().min(1),
})

export const paragraphBlockSchema = z.object({
  kind: z.literal('paragraph'),
  md,
})

export const listBlockSchema = z.object({
  kind: z.literal('list'),
  style: z.enum(['bullet', 'numbered']),
  items: z.array(md).min(1),
})

export const calloutBlockSchema = z.object({
  kind: z.literal('callout'),
  tone: z.enum(['note', 'example', 'tip']),
  md,
})

export const stepsBlockSchema = z.object({
  kind: z.literal('steps'),
  items: z.array(z.object({ label: z.string().min(1), md })).min(1),
})

export const resourceEmbedBlockSchema = z.object({
  kind: z.literal('resourceEmbed'),
  resourceId: z.string().optional(),
  url: z.string().min(1),
  media: z.enum(['video', 'article']),
  title: z.string().min(1),
  startSec: z.number().int().nonnegative().optional(),
  endSec: z.number().int().positive().optional(),
  focus: md.optional(),
})

// Interactive blocks — all record into the `responses` table

export const mcqBlockSchema = z.object({
  kind: z.literal('mcq'),
  id: z.string().min(1),
  prompt: md,
  options: z.array(z.object({ id: z.string().min(1), label: md })).min(2),
  correctId: z.string().optional(),
  explain: md.optional(),
})

export const freeTextBlockSchema = z.object({
  kind: z.literal('freeText'),
  id: z.string().min(1),
  prompt: md,
  placeholder: z.string().optional(),
  minimal: z.boolean().optional(),
  /**
   * A way into the answer, shown when the learner asks for it — never the
   * answer itself. Blank is allowed: without one there's just no pill, which
   * isn't worth a repair round-trip. `checkActivityDoc` flags it instead.
   */
  consider: z.string().optional(),
})

export const fillBlankBlockSchema = z.object({
  kind: z.literal('fillBlank'),
  id: z.string().min(1),
  md,
  blanks: z
    .array(
      z.object({
        id: z.string().min(1),
        answer: z.string().min(1),
        alts: z.array(z.string()).optional(),
      }),
    )
    .min(1),
})

export const orderingBlockSchema = z.object({
  kind: z.literal('ordering'),
  id: z.string().min(1),
  prompt: md,
  items: z.array(z.object({ id: z.string().min(1), label: md })).min(2),
  correctOrder: z.array(z.string().min(1)).min(2),
})

export const matchingBlockSchema = z.object({
  kind: z.literal('matching'),
  id: z.string().min(1),
  prompt: md,
  pairs: z
    .array(
      z.object({
        leftId: z.string().min(1),
        left: md,
        rightId: z.string().min(1),
        right: md,
      }),
    )
    .min(2),
})

export const revealBlockSchema = z.object({
  kind: z.literal('reveal'),
  id: z.string().min(1),
  prompt: md,
  md,
})

export const selfRateBlockSchema = z.object({
  kind: z.literal('selfRate'),
  id: z.string().min(1),
  prompt: md,
  scale: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
})

export const blockSchema = z.discriminatedUnion('kind', [
  headingBlockSchema,
  paragraphBlockSchema,
  listBlockSchema,
  calloutBlockSchema,
  stepsBlockSchema,
  resourceEmbedBlockSchema,
  mcqBlockSchema,
  freeTextBlockSchema,
  fillBlankBlockSchema,
  orderingBlockSchema,
  matchingBlockSchema,
  revealBlockSchema,
  selfRateBlockSchema,
])

export type Block = z.infer<typeof blockSchema>
export type BlockKind = Block['kind']

export const INTERACTIVE_BLOCK_KINDS = [
  'mcq',
  'freeText',
  'fillBlank',
  'ordering',
  'matching',
  'reveal',
  'selfRate',
] as const satisfies readonly BlockKind[]

export type InteractiveBlockKind = (typeof INTERACTIVE_BLOCK_KINDS)[number]

export function isInteractiveBlock(block: Block): boolean {
  return (INTERACTIVE_BLOCK_KINDS as readonly string[]).includes(block.kind)
}
