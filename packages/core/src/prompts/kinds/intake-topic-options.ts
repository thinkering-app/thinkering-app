import type { z } from 'zod'
import { intakeOutcomesParamsSchema, renderLearner } from './intake-outcomes'
import { topicOptionsOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G2b `intake.topicOptions` — fired on intake step 3 → 4 alongside G2
 * (`intake.outcomes`), with the same params; consumes G1's output. The topic
 * chips step 5 offers, worded for how much experience the learner has. Step 4
 * covers its wait.
 */

export const intakeTopicOptionsParamsSchema = intakeOutcomesParamsSchema
export type IntakeTopicOptionsParams = z.infer<typeof intakeTopicOptionsParamsSchema>

const INSTRUCTIONS = `Task: propose ~10 topic chips the learner will pick from ("Which topics feel most relevant?"). Mix three origins — the mix is invisible to the user:
- "motivation": directly aligned with why they're learning this
- "foundational": prerequisites/basics their experience level suggests they need
- "adjacent": nearby-but-interesting territory that keeps the path fresh

Return JSON: { "topics": [{ "label": string, "origin": "motivation"|"foundational"|"adjacent", "blurb": string }] }
Labels: 2–5 words, chip-sized, concrete. Blurb: one plain sentence on what this covers. 9–12 topics, no near-duplicates.

Pitch the topics to their experience — it changes the words as much as the mix. Their note on what they've tried outranks the level they picked.
- getting_started, explored: name each topic in words they'd already use — the thing it lets them do or the question it answers, not the field's term for it ("How AI tools guess the next word", not "Transformer architecture"). Mostly foundational, nothing that needs another topic on the list first, and no blurb that leans on a term the label avoided.
- in_middle: the field's everyday terms are fine; fewer basics, more filling gaps and connecting what they know.
- experienced: the field's precise terms; depth, nuance and craft, and basics only where their note points to a gap.`

export const intakeTopicOptionsTemplate: PromptTemplate<
  IntakeTopicOptionsParams,
  z.infer<typeof topicOptionsOutputSchema>
> = {
  kind: 'intake.topicOptions',
  version: 1,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: intakeTopicOptionsParamsSchema,
  outputSchema: topicOptionsOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [{ role: 'user', content: renderLearner(params) }],
  }),
}
