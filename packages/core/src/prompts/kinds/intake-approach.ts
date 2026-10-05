import { z } from 'zod'
import { cappedText } from '../../limits'
import { PROGRESS_KINDS } from '../../domain'
import { approachOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G1 `intake.approach` — fired on intake step 3 → 4, once experience is known,
 * alongside G2 and G2b, which don't wait on it. G3 does: it has steps 4 and 5
 * to finish. Experience stays optional because builds before the move fire it
 * on step 2 → 3 and send none (docs/04 §Retired kinds).
 */

/**
 * The approach as G3 gets it back. It is this kind's output, but the client
 * returns it and the learner can edit the notes, so it is bounded like any
 * other params rather than trusted as model output. The brief's newer fields
 * are optional: builds before them send only domain, notes, pitfalls and
 * principles.
 */
export const approachParamSchema = z.object({
  domain: cappedText('line', { min: 1 }),
  progress: z.enum(PROGRESS_KINDS).optional(),
  approachNotes: cappedText('note', { min: 1 }),
  practice: cappedText('note', { min: 1 }).optional(),
  goodLooksLike: z
    .array(cappedText('note', { min: 1 }))
    .min(1)
    .optional(),
  pitfalls: z.array(cappedText('note', { min: 1 })).min(1),
  progressionPrinciples: z.array(cappedText('note', { min: 1 })).min(1),
})

/** The brief's newer lines, for the kinds that get the approach back; none from older builds. */
export function approachBriefLines(approach: z.infer<typeof approachParamSchema>): string[] {
  return [
    ...(approach.progress ? [`Progress here is mostly: ${approach.progress}`] : []),
    ...(approach.practice ? [`A practice attempt: ${approach.practice}`] : []),
    ...(approach.goodLooksLike
      ? [`Doing it well looks like: ${approach.goodLooksLike.join(' · ')}`]
      : []),
  ]
}

export const intakeApproachParamsSchema = z.object({
  wantToLearn: cappedText('wantToLearn', { min: 1 }),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: cappedText('note').optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']).optional(),
  experienceText: cappedText('note').optional(),
})
export type IntakeApproachParams = z.infer<typeof intakeApproachParamsSchema>

const INSTRUCTIONS = `Task: write the brief that steers every later generation for this interest — how getting better at this actually works, for this person, at their level — and a short note to the learner.

Return JSON: {
  "domain": string,                    // the field, named plainly in 2–5 words: "conversational German", "team leadership", "2D game development", "personal finance"
  "progress": "understanding" | "doing" | "with_people" | "making",
                                       // what getting better here mostly is. understanding: knowing and explaining ideas (history, how LLMs work). doing: a skill or procedure you carry out yourself (coding, chess, a language's grammar, cooking). with_people: doing it with or in front of others (leading, presenting, negotiating, conversation). making: producing work (games, songs, drawings, stories). Pick the one their goal leans on most.
  "approachNotes": string,             // to the learner ("you"), 3–4 sentences, 90 words maximum: the specific, useful insight about learning this at their level — what tends to make the difference, where to put the effort, what to skip for now. Write as someone who knows the field, not as a description of teaching methods or of this app.
  "practice": string,                  // 1–2 sentences, 40 words maximum: what one practice attempt looks like for them at their level, and where it happens — on the page, or out in their life (a real conversation, a meeting, a build session)
  "goodLooksLike": string[],           // exactly 3 observable signs of doing it well at their level, one line of 15 words maximum each — what someone watching, or the work itself, would show
  "pitfalls": string[],                // exactly 3 traps specific to this domain and level (illusions of progress, common misconceptions, habits that stall people), one line of 20 words maximum each
  "progressionPrinciples": string[]    // exactly 3 principles for sequencing what they learn here, at this level, one line of 20 words maximum each
}

Pitch everything to their experience: a newcomer gets everyday words and first steps; someone experienced gets the field's terms and the edge of their craft. Their own words about their experience outrank the label. If no experience is given, assume they're fairly new to it, and don't mention it.

Only the approach notes are shown to the learner; the rest is a brief for later generations, and briefs are short.`

export const intakeApproachTemplate: PromptTemplate<
  IntakeApproachParams,
  z.infer<typeof approachOutputSchema>
> = {
  kind: 'intake.approach',
  // v5: fired once experience is known; adds progress, practice and
  // goodLooksLike, and the notes are insight for the learner rather than method.
  version: 5,
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
                `Experience: ${params.experienceChoice}${params.experienceText ? ` — in their words: ${params.experienceText}` : ''}`,
              ]
            : []),
        ].join('\n'),
      },
    ],
  }),
}
