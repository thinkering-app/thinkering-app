import { z } from 'zod'
import { approachOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/** G1 `intake.approach` — fired on intake step 2 → 3; runs in the background. */

export const intakeApproachParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
})
export type IntakeApproachParams = z.infer<typeof intakeApproachParamsSchema>

const INSTRUCTIONS = `Task: classify the learning domain and write the approach notes that will steer every later generation for this interest.

Return JSON: {
  "domain": string,                    // short classification, e.g. "language acquisition", "quantitative-technical", "creative-physical skill", "strategy game", "knowledge-rich domain"
  "approachNotes": string,             // 3–6 sentences: what works for teaching this domain to this person, given their why and experience; concrete, method-level, no fluff. The user can read and edit this text.
  "pitfalls": string[],                // 2–5 domain-specific traps (illusions of fluency, common misconceptions, motivation cliffs)
  "progressionPrinciples": string[]    // 2–5 principles for sequencing topics in this domain for this experience level
}

The approach notes are user-visible: write them to the learner ("you"), plainly.`

export const intakeApproachTemplate: PromptTemplate<
  IntakeApproachParams,
  z.infer<typeof approachOutputSchema>
> = {
  kind: 'intake.approach',
  version: 1,
  model: 'sonnet',
  maxTokens: 1500,
  paramsSchema: intakeApproachParamsSchema,
  outputSchema: approachOutputSchema,
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
