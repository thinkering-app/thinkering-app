import { z } from 'zod'
import { cappedText } from '../../limits'
import { approachParamSchema } from './intake-approach'
import { outcomesOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G2 `intake.outcomes` — fired on intake step 3 → 4, alongside G2b
 * (`intake.topicOptions`); consumes G1's output. What step 4 offers in answer
 * to "What are you hoping for?". A short answer on its own, so step 4 doesn't
 * wait on the topics step 5 needs.
 */

export const intakeOutcomesParamsSchema = z.object({
  wantToLearn: cappedText('wantToLearn', { min: 1 }),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: cappedText('note').optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: cappedText('note').optional(),
  approach: approachParamSchema,
})
export type IntakeOutcomesParams = z.infer<typeof intakeOutcomesParamsSchema>

const INSTRUCTIONS = `Task: propose outcomes the learner could pick in answer to "What are you hoping for?". They pick any that fit, or none.

Return JSON: { "outcomes": [string] }
3–5 outcomes. Each is first person, in the learner's own voice: "I can…", "I understand…", "I've made…", "I feel confident…". 3–10 words, sentence case, no trailing period.
Make them genuinely varied, and a bit longer term — cover different kinds of success, not one kind restated: understanding something, doing something, making or finishing something, a real moment in their life tied to why they're learning, and confidence or habit. Concrete and specific to what they told you, and pitched to their experience: reachable in weeks to months, not years.
An outcome is what being further along feels like, not a topic to study.
Don't assume details they didn't give: if they mention a partner, family or colleague without saying who, write "their" or "my partner's", never "his" or "her".`

export const intakeOutcomesTemplate: PromptTemplate<
  IntakeOutcomesParams,
  z.infer<typeof outcomesOutputSchema>
> = {
  kind: 'intake.outcomes',
  version: 1,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: intakeOutcomesParamsSchema,
  outputSchema: outcomesOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [{ role: 'user', content: renderLearner(params) }],
  }),
}

/** What G2 and G2b both know about the learner — the same params, the same lines. */
export function renderLearner(params: IntakeOutcomesParams): string {
  return [
    `They want to learn: ${params.wantToLearn}`,
    `Why: ${params.whyChoice}${params.whyText ? ` — ${params.whyText}` : ''}`,
    `Experience: ${params.experienceChoice}${params.experienceText ? ` — ${params.experienceText}` : ''}`,
    `Domain: ${params.approach.domain}`,
    `Approach notes: ${params.approach.approachNotes}`,
    `Progression principles: ${params.approach.progressionPrinciples.join(' · ')}`,
  ].join('\n')
}
