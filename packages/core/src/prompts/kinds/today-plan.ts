import { z } from 'zod'
import { cappedText } from '../../limits'
import { dailyPlanOutputSchema } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { libraryReference, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G5a `today.plan` — cheap daily-plan call on app open; cached per interest per
 * local date. The deterministic scheduler has already picked the goals; this
 * call picks a library item per card from the active set and writes the title.
 */

const pickSchema = z.object({
  /**
   * Null for the strengthen prerequisite fallback — invent a prerequisite
   * topic — or for a learner's request that names no goal.
   */
  goalId: cappedText('line').nullable(),
  goalTitle: cappedText('line').nullable(),
  /** What the learner asked this card to focus on, or how they want to learn it (the + card). */
  focus: cappedText('note').optional(),
})

export const todayPlanParamsSchema = z.object({
  context: interestContextInputSchema,
  sessionMinutes: z.number().int().positive(),
  picks: z.object({
    next: z.array(pickSchema),
    strengthen: z.array(pickSchema),
    goFurther: z.array(pickSchema),
  }),
  /** Active item ids per section — choose only from these. */
  activeItems: z.object({
    next: z.array(cappedText('line')),
    strengthen: z.array(cappedText('line')),
    goFurther: z.array(cappedText('line')),
  }),
  /** Library items used yesterday per goal id — avoid repeating for the same goal. */
  yesterdayItems: z
    .array(z.object({ goalId: cappedText('line'), libraryItemId: cappedText('line') }))
    .optional(),
  /** Titles of resources well-matched per goal id, to prefer usesResources items. */
  matchedResources: z
    .array(z.object({ goalId: cappedText('line'), resourceTitle: cappedText('line') }))
    .optional(),
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
- A pick with goalId null and no learner request is the strengthen prerequisite fallback: choose a genuinely prerequisite topic for their path (set "topic" to its short name) and pick a fitting strengthen item.
- A pick with a learner request comes from the learner asking for this card. Choose the item and title to serve the request: what to focus on, or how they want to learn it. When the request names a way of learning and an active item matches it, choose that item even if the topic suits another one better or it was used recently — the learner's "how" outranks fit and variety. "Quiz me" or "test me" means retrieval-quiz; "walk me through an example" means a worked or faded example. If it has no goal, set "topic" to a short name for what they asked about.
- Titles: concrete and specific to the goal + item (like "Spot the error: der/die/das" or "Tokens, not words"), max ~50 chars, sentence case, no colons unless natural.
- estMinutes: the learner's session length for Next; same or slightly less for Strengthen; may be slightly more for Go further.

${libraryReference()}`

export const todayPlanTemplate: PromptTemplate<
  TodayPlanParams,
  z.infer<typeof dailyPlanOutputSchema>
> = {
  kind: 'today.plan',
  // v2: a pick can carry the learner's own request, from the + card; one that
  // names a way of learning gets the matching item.
  // v3: saved resources in the context arrive inside <resource_notes> tags,
  // named as material, not instructions — their notes were drafted from web pages.
  version: 3,
  model: 'haiku',
  maxTokens: 1500,
  temperature: 0.7,
  paramsSchema: todayPlanParamsSchema,
  outputSchema: dailyPlanOutputSchema,
  render: (params) => {
    const pickLine = (p: z.infer<typeof pickSchema>) => {
      const request = p.focus ? ` — learner request: "${p.focus}"` : ''
      if (p.goalId) return `goal ${p.goalId} — "${p.goalTitle ?? ''}"${request}`
      return p.focus ? `NO GOAL (goalId null)${request}` : 'PREREQUISITE FALLBACK (goalId null)'
    }
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
              ? [
                  `Yesterday's items: ${params.yesterdayItems.map((y) => `${y.goalId}→${y.libraryItemId}`).join(', ')}`,
                ]
              : []),
            ...(params.matchedResources && params.matchedResources.length > 0
              ? [
                  `Well-matched resources: ${params.matchedResources.map((m) => `${m.goalId}: ${m.resourceTitle}`).join(' | ')}`,
                ]
              : []),
          ].join('\n'),
        },
      ],
    }
  },
}
