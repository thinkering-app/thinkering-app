import { z } from 'zod'
import { reviewOutputSchema, type ReviewOutput } from '../../schemas/generations'
import { buildInterestContext, type InterestContextInput } from '../context-assembly'
import { ACTIVITY_DOC_FORMAT, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G6 `activity.review` — fills the reserved review page while the learner reads
 * the page before it (docs/05). One thing, chosen well: a misconception to
 * correct, a good answer to build on, or an implicit question to answer.
 */

export const activityReviewParamsSchema = z.object({
  context: z.custom<InterestContextInput>((v) => typeof v === 'object' && v !== null),
  activityTitle: z.string(),
  tier: z.enum(['introduce', 'strengthen', 'apply']),
  goal: z.object({ title: z.string(), description: z.string() }),
  conceptLabels: z.array(z.string()),
  /** One line per answered block, in reading order (see describeResponse). */
  responses: z.array(z.string()),
  /** The concept the learner struggled with most, when the sparse-response fallback applies. */
  trickiestConcept: z.string().optional(),
})
export type ActivityReviewParams = z.infer<typeof activityReviewParamsSchema>

const INSTRUCTIONS = `Task: write the review page of an activity the learner has just worked through. You see their actual answers.

Return JSON: { "blocks": Block[] }  — 1–3 blocks, using the same Block types as an Activity Document.

${ACTIVITY_DOC_FORMAT}

Choose exactly one thing to do, whichever is most valuable for this learner right now:
- Correct a misconception their answers reveal — kindly, directly, and specifically; name what they said and what's actually true.
- Build on a good answer — add the next layer of nuance it earned.
- Answer a question their answer implies but didn't ask.
If their answers were sparse or mostly blank, reinforce the trickiest concept in the activity instead, without remarking on how little they wrote.

Rules:
- Short: a heading is optional, then one or two short paragraphs — under 80 words in all. It's read on a phone.
- One thing only. Don't walk through their answers one by one; leave the rest unsaid.
- An interactive block is allowed but not required — never add one just to have one.
- Speak to what they wrote. Quote or paraphrase their words when you correct or extend them.
- Praise only when it's earned and specific about why. No "Great job!", no filler.
- Never imply their knowledge is limited to this app.`

export const activityReviewTemplate: PromptTemplate<ActivityReviewParams, ReviewOutput> = {
  kind: 'activity.review',
  version: 2,
  model: 'haiku',
  maxTokens: 1200,
  temperature: 0.6,
  paramsSchema: activityReviewParamsSchema,
  outputSchema: reviewOutputSchema,
  render: (params) => ({
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
          `Activity: ${params.activityTitle} (${params.tier})`,
          `Goal: ${params.goal.title} — ${params.goal.description}`,
          `Concepts targeted: ${params.conceptLabels.join(', ')}`,
          ...(params.trickiestConcept
            ? [`Trickiest concept here: ${params.trickiestConcept}`]
            : []),
          '',
          'Their answers:',
          ...(params.responses.length > 0 ? params.responses : ['(they answered nothing)']),
        ].join('\n'),
      },
    ],
  }),
}
