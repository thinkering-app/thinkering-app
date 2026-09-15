import { z } from 'zod'
import { approachOutputSchema, topicsOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/** G2 `intake.topics` — fired on intake step 3 → 4; consumes G1's output. */

export const intakeTopicsParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
  approach: approachOutputSchema,
})
export type IntakeTopicsParams = z.infer<typeof intakeTopicsParamsSchema>

const INSTRUCTIONS = `Task: propose ~10 topic chips the learner will pick from ("Which topics feel most relevant?"). Mix three origins — the mix is invisible to the user:
- "motivation": directly aligned with why they're learning this
- "foundational": prerequisites/basics their experience level suggests they need
- "adjacent": nearby-but-interesting territory that keeps the path fresh

Return JSON: { "topics": [{ "label": string, "origin": "motivation"|"foundational"|"adjacent", "blurb": string }] }
Labels: 2–5 words, chip-sized, concrete, no jargon the learner wouldn't recognize at their level. Blurb: one plain sentence on what this covers. 9–12 topics, no near-duplicates.`

export const intakeTopicsTemplate: PromptTemplate<IntakeTopicsParams, z.infer<typeof topicsOutputSchema>> = {
  kind: 'intake.topics',
  version: 1,
  model: 'sonnet',
  maxTokens: 2000,
  paramsSchema: intakeTopicsParamsSchema,
  outputSchema: topicsOutputSchema,
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
          `Domain: ${params.approach.domain}`,
          `Approach notes: ${params.approach.approachNotes}`,
          `Progression principles: ${params.approach.progressionPrinciples.join(' · ')}`,
        ].join('\n'),
      },
    ],
  }),
}
