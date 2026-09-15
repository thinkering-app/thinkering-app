import { z } from 'zod'
import { dailyPlanOutputSchema } from '../../schemas/generations'
import { buildInterestContext, type InterestContextInput } from '../context-assembly'
import { libraryReference, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G5a `today.plan` — cheap daily-plan call on app open; cached per interest per
 * local date. The deterministic scheduler has already picked the goals; this
 * call picks a library item per card from the active set and writes the title.
 */

const pickSchema = z.object({
  /** Null for the strengthen prerequisite fallback — invent a prerequisite topic. */
  goalId: z.string().nullable(),
  goalTitle: z.string().nullable(),
})

export const todayPlanParamsSchema = z.object({
  context: z.custom<InterestContextInput>((v) => typeof v === 'object' && v !== null),
  sessionMinutes: z.number().int().positive(),
  picks: z.object({
    next: z.array(pickSchema),
    strengthen: z.array(pickSchema),
    goFurther: z.array(pickSchema),
  }),
  /** Active item ids per section — choose only from these. */
  activeItems: z.object({
    next: z.array(z.string()),
    strengthen: z.array(z.string()),
    goFurther: z.array(z.string()),
  }),
  /** Library items used yesterday per goal id — avoid repeating for the same goal. */
  yesterdayItems: z.array(z.object({ goalId: z.string(), libraryItemId: z.string() })).optional(),
  /** Titles of resources well-matched per goal id, to prefer usesResources items. */
  matchedResources: z.array(z.object({ goalId: z.string(), resourceTitle: z.string() })).optional(),
})
export type TodayPlanParams = z.infer<typeof todayPlanParamsSchema>

const INSTRUCTIONS = `Task: turn the scheduler's goal picks into today's cards. For every pick, choose one library item (from the active set for that section only) and write the card title.

Return JSON: {
  "next": Card[], "strengthen": Card[], "goFurther": Card[]
}
Card = { "goalId": string|null, "topic"?: string, "libraryItemId": string, "title": string, "estMinutes": number }

Rules:
- One card per pick, same order. Never invent, drop, or reorder goals.
- Choose items by fit: the item's "good for" hint vs the domain and the goal; variety (avoid yesterday's item for the same goal); prefer items built around a saved resource only when a well-matched resource is listed for that goal.
- A pick with goalId null is the strengthen prerequisite fallback: choose a genuinely prerequisite topic for their path (set "topic" to its short name) and pick a fitting strengthen item.
- Titles: concrete and specific to the goal + item (like "Spot the error: der/die/das" or "Tokens, not words"), max ~50 chars, sentence case, no colons unless natural.
- estMinutes: the learner's session length for Next; same or slightly less for Strengthen; may be slightly more for Go further.

${libraryReference()}`

export const todayPlanTemplate: PromptTemplate<TodayPlanParams, z.infer<typeof dailyPlanOutputSchema>> = {
  kind: 'today.plan',
  version: 1,
  model: 'haiku',
  maxTokens: 1500,
  temperature: 0.7,
  paramsSchema: todayPlanParamsSchema,
  outputSchema: dailyPlanOutputSchema,
  render: (params) => {
    const pickLine = (p: z.infer<typeof pickSchema>) =>
      p.goalId ? `goal ${p.goalId} — "${p.goalTitle ?? ''}"` : 'PREREQUISITE FALLBACK (goalId null)'
    return {
      system: [
        { text: SHARED_PREAMBLE, cache: true },
        { text: INSTRUCTIONS, cache: true },
      ],
      messages: [
        {
          role: 'user',
          content: [
            buildInterestContext(params.context),
            '',
            `Session length: ${params.sessionMinutes} minutes`,
            `Scheduler picks — Next: ${params.picks.next.map(pickLine).join(' | ') || '(none)'}`,
            `Scheduler picks — Strengthen: ${params.picks.strengthen.map(pickLine).join(' | ') || '(none)'}`,
            `Scheduler picks — Go further: ${params.picks.goFurther.map(pickLine).join(' | ') || '(none)'}`,
            `Active items — next: ${params.activeItems.next.join(', ')}`,
            `Active items — strengthen: ${params.activeItems.strengthen.join(', ')}`,
            `Active items — go further: ${params.activeItems.goFurther.join(', ')}`,
            ...(params.yesterdayItems && params.yesterdayItems.length > 0
              ? [`Yesterday's items: ${params.yesterdayItems.map((y) => `${y.goalId}→${y.libraryItemId}`).join(', ')}`]
              : []),
            ...(params.matchedResources && params.matchedResources.length > 0
              ? [`Well-matched resources: ${params.matchedResources.map((m) => `${m.goalId}: ${m.resourceTitle}`).join(' | ')}`]
              : []),
          ].join('\n'),
        },
      ],
    }
  },
}
