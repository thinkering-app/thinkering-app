import { z } from 'zod'
import { cappedText } from '../../limits'
import { reviewOutputSchema, type ReviewOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G6 `activity.review` — fills the reserved review page while the learner reads
 * the page before it (docs/05). One thing, chosen well: a misconception to
 * correct, a good answer to build on, or an implicit question to answer.
 */

export const activityReviewParamsSchema = z.object({
  context: interestContextInputSchema,
  activityTitle: cappedText('line'),
  tier: z.enum(['introduce', 'strengthen', 'apply']),
  goal: z.object({ title: cappedText('line'), description: cappedText('note') }),
  conceptLabels: z.array(cappedText('line')),
  /** One line per answered block, in reading order (see describeResponse). */
  responses: z.array(cappedText('long')),
  /** The concept the learner struggled with most, when the sparse-response fallback applies. */
  trickiestConcept: cappedText('line').optional(),
})
export type ActivityReviewParams = z.infer<typeof activityReviewParamsSchema>

const INSTRUCTIONS = `Task: write the review page of an activity the learner has just worked through. You see their actual answers.

Return JSON: { "blocks": [{ "kind": "paragraph", "md": string }] } — exactly one paragraph. No other block kinds. "md" allows only inline bold, italic and code.

Choose exactly one thing to say, whichever is most valuable for this learner right now:
- Correct a misconception their answers reveal — kindly, directly, and specifically; name what they said and what's actually true.
- Build on a good answer — add the next layer of nuance it earned.
- Answer a question their answer implies but didn't ask.
If their answers were sparse or mostly blank, reinforce the trickiest concept in the activity instead, without remarking on how little they wrote.

Rules:
- Under 45 words. One paragraph on a phone, between the last page and the summary — not a lesson, not a wrap-up of the session.
- One thing only. Don't walk through their answers in turn, don't clear up the other mistakes too, don't close with a tip or an encouragement. Leave the rest unsaid.
- Speak to what they wrote. Quote or paraphrase their words when you correct or extend them.
- Praise only when it's earned and specific about why. No "Great job!", no filler.
- Never imply their knowledge is limited to this app.`

export const activityReviewTemplate: PromptTemplate<ActivityReviewParams, ReviewOutput> = {
  kind: 'activity.review',
  // v2: 1–3 blocks, under 80 words, one thing only.
  // v3: one paragraph under 45 words — v2 still read as a lesson on device.
  //     The Activity Document format left with it: the page is prose now, and
  //     listing every block kind was an invitation to use them.
  // v4: saved resources in the context arrive inside <resource_notes> tags,
  // named as material, not instructions — their notes were drafted from web pages.
  version: 4,
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
