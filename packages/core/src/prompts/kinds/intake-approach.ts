import { z } from 'zod'
import { cappedText } from '../../limits'
import { approachOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G1 `intake.approach` — fired on intake step 2 → 3; runs in the background
 * while the user answers step 3. Experience is therefore optional here: it's
 * the very question they're on when this call goes out (docs/01 §1). G2 and G3
 * get it in full.
 */

/**
 * The approach as the later intake kinds get it back. It is this kind's output,
 * but the client returns it and the learner can edit the notes, so it is
 * bounded like any other params rather than trusted as model output.
 */
export const approachParamSchema = z.object({
  domain: cappedText('line', { min: 1 }),
  approachNotes: cappedText('note', { min: 1 }),
  pitfalls: z.array(cappedText('note', { min: 1 })).min(1),
  progressionPrinciples: z.array(cappedText('note', { min: 1 })).min(1),
})

export const intakeApproachParamsSchema = z.object({
  wantToLearn: cappedText('wantToLearn', { min: 1 }),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: cappedText('note').optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']).optional(),
  experienceText: cappedText('note').optional(),
})
export type IntakeApproachParams = z.infer<typeof intakeApproachParamsSchema>

const INSTRUCTIONS = `Task: classify the learning domain and write the approach notes that will steer every later generation for this interest.

Their experience level may be missing — they are answering that question right now. When it is, write notes that hold across levels and say what changes with experience, rather than guessing.

Return JSON: {
  "domain": string,                    // short classification, e.g. "language acquisition", "quantitative-technical", "creative-physical skill", "strategy game", "knowledge-rich domain"
  "approachNotes": string,             // 3–4 sentences, 90 words maximum: what works for teaching this domain to this person, given their why and experience; concrete, method-level, no fluff. The user can read and edit this text.
  "pitfalls": string[],                // exactly 3 domain-specific traps (illusions of fluency, common misconceptions, motivation cliffs), one line of 20 words maximum each
  "progressionPrinciples": string[]    // exactly 3 principles for sequencing topics in this domain at this level, one line of 20 words maximum each
}

Every later generation reads this, so it is a brief, and briefs are short. Downstream calls wait on it.

The approach notes are user-visible: write them to the learner ("you"), plainly.`

export const intakeApproachTemplate: PromptTemplate<
  IntakeApproachParams,
  z.infer<typeof approachOutputSchema>
> = {
  kind: 'intake.approach',
  version: 4,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
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
          ...(params.experienceChoice
            ? [
                `Experience: ${params.experienceChoice}${params.experienceText ? ` — ${params.experienceText}` : ''}`,
              ]
            : ['Experience: not stated yet']),
        ].join('\n'),
      },
    ],
  }),
}
