import { z } from 'zod'
import { approachOutputSchema, pathOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G3 `intake.path` — fired on intake step 5 → 6 and streamed onto step 7 (name
 * first, then goals); the time question on step 6 covers the wait. Session
 * length isn't known yet when it goes out, so goals are scoped to a short session.
 */

export const intakePathParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
  approach: approachOutputSchema,
  selectedTopics: z.array(z.string()),
  unselectedTopics: z.array(z.string()).optional(),
  /** What would feel like success — picked or written on step 5. */
  successOutcomes: z.array(z.string()).optional(),
})
export type IntakePathParams = z.infer<typeof intakePathParamsSchema>

const INSTRUCTIONS = `Task: name the interest and lay out its initial path.

Return JSON: {
  "name": string,        // short display name for the interest, 2–4 words, sentence case ("Conversational German", "Understanding LLMs") — emit this field FIRST so it streams early
  "goals": [{
    "title": string,                 // one well-scoped unit, outcome-flavored ("Read a simple menu", "Explain what a token is")
    "description": string,           // one–two plain lines on what this covers
    "concepts": [{ "label": string, "kind": "concept"|"skill" }]   // 2–4 key concepts/skills beneath the goal, 2–5 words each — they render as chips; "skill" = something you do, "concept" = something you understand
  }]
}

5–8 goals, pedagogically sequenced by the progression principles: prerequisites before dependents, concrete before abstract, early wins first. Each goal must be introducible in one short session (5–15 minutes). Selected topics get priority coverage; weave in unselected foundational ground where skipping it would hurt. Goals are not topics: scope each to what one session can genuinely teach. When they've said what would feel like success, the path should lead there: the later goals are the ones that get them to it.`

export const intakePathTemplate: PromptTemplate<
  IntakePathParams,
  z.infer<typeof pathOutputSchema>
> = {
  kind: 'intake.path',
  version: 4,
  model: 'sonnet',
  maxTokens: 16000,
  effort: 'high',
  paramsSchema: intakePathParamsSchema,
  outputSchema: pathOutputSchema,
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
          `Pitfalls to design around: ${params.approach.pitfalls.join(' · ')}`,
          `Topics they selected: ${params.selectedTopics.length > 0 ? params.selectedTopics.join(', ') : '(none selected)'}`,
          ...(params.unselectedTopics && params.unselectedTopics.length > 0
            ? [`Topics shown but not selected: ${params.unselectedTopics.join(', ')}`]
            : []),
          ...(params.successOutcomes && params.successOutcomes.length > 0
            ? [`What would feel like success: ${params.successOutcomes.join(' · ')}`]
            : []),
        ].join('\n'),
      },
    ],
  }),
}
