import { z } from 'zod'
import { questionOutputSchema, type QuestionOutput } from '../../schemas/generations'
import { buildInterestContext, type InterestContextInput } from '../context-assembly'
import { ACTIVITY_DOC_FORMAT, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G7 `activity.question` — the Ask button. Answers the learner's question as a
 * page inserted right after the one they're on (docs/05), streamed in.
 */

export const activityQuestionParamsSchema = z.object({
  context: z.custom<InterestContextInput>((v) => typeof v === 'object' && v !== null),
  activityTitle: z.string(),
  goal: z.object({ title: z.string(), description: z.string() }),
  /** Plain-text rendering of the page they asked from, so the answer lands in context. */
  currentPageText: z.string(),
  question: z.string().min(1),
})
export type ActivityQuestionParams = z.infer<typeof activityQuestionParamsSchema>

const INSTRUCTIONS = `Task: answer the learner's question as one page inserted into the activity they're doing, right after the page they asked from.

Return JSON: { "blocks": Block[] }  — 2–5 blocks, using the same Block types as an Activity Document.

${ACTIVITY_DOC_FORMAT}

Rules:
- Answer the question they actually asked, at the level the activity is pitched at. Concrete over abstract; one idea, not a lecture.
- Include an interactive block only when they asked for practice or when a quick check genuinely helps the answer land. Most answers need none.
- If the question is outside this goal, answer it briefly and honestly anyway — curiosity is not a detour.
- Don't restate the page they're on, and don't tell them they'll cover it later.`

export const activityQuestionTemplate: PromptTemplate<ActivityQuestionParams, QuestionOutput> = {
  kind: 'activity.question',
  version: 3,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: activityQuestionParamsSchema,
  outputSchema: questionOutputSchema,
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
          `Activity: ${params.activityTitle}`,
          `Goal: ${params.goal.title} — ${params.goal.description}`,
          '',
          'The page they asked from:',
          params.currentPageText,
          '',
          `Their question: ${params.question}`,
        ].join('\n'),
      },
    ],
  }),
}
