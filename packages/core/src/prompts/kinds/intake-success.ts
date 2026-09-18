import { z } from 'zod'
import { successOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G2b `intake.success` — fired alongside G2 on intake step 3 → 4 and shown on
 * step 5. It doesn't wait on G1: the answers so far are enough to say what
 * success could look like, and the step it lands on is right after topics.
 */

export const intakeSuccessParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
})
export type IntakeSuccessParams = z.infer<typeof intakeSuccessParamsSchema>

const INSTRUCTIONS = `Task: propose outcomes the learner could pick in answer to "What would feel like success?". They pick any that fit, or none.

Return JSON: { "outcomes": string[] }
3–5 outcomes. Each is first person, in the learner's own voice: "I can…", "I understand…", "I've made…", "I feel confident…". 3–10 words, sentence case, no trailing period.
Make them genuinely varied, and a bit longer term — cover different kinds of success, not one kind restated: understanding something, doing something, making or finishing something, a real moment in their life tied to why they're learning, and confidence or habit. Concrete and specific to what they told you, and pitched to their experience: reachable in weeks to months, not years.`

export const intakeSuccessTemplate: PromptTemplate<
  IntakeSuccessParams,
  z.infer<typeof successOutputSchema>
> = {
  kind: 'intake.success',
  version: 1,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: intakeSuccessParamsSchema,
  outputSchema: successOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          `They want to learn: ${params.wantToLearn}`,
          `Why: ${params.whyChoice}${params.whyText ? ` — ${params.whyText}` : ''}`,
          `Experience: ${params.experienceChoice}${params.experienceText ? ` — ${params.experienceText}` : ''}`,
        ].join('\n'),
      },
    ],
  }),
}
