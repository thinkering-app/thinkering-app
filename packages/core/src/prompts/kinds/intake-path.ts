import { z } from 'zod'
import { approachOutputSchema, pathOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/** G3 `intake.path` — fired on intake step 5 → 6; streamed onto step 6 (name first, then goals). */

export const intakePathParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
  sessionMinutes: z.number().int().positive(),
  approach: approachOutputSchema,
  selectedTopics: z.array(z.string()),
  unselectedTopics: z.array(z.string()).optional(),
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

5–8 goals, pedagogically sequenced by the progression principles: prerequisites before dependents, concrete before abstract, early wins first. Each goal must be introducible in one session of the learner's stated length (see their session length below). Selected topics get priority coverage; weave in unselected foundational ground where skipping it would hurt. Goals are not topics: scope each to what one session can genuinely teach.`

export const intakePathTemplate: PromptTemplate<IntakePathParams, z.infer<typeof pathOutputSchema>> = {
  kind: 'intake.path',
  version: 3,
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
          `Session length: ${params.sessionMinutes} minutes`,
          `Domain: ${params.approach.domain}`,
          `Approach notes: ${params.approach.approachNotes}`,
          `Progression principles: ${params.approach.progressionPrinciples.join(' · ')}`,
          `Pitfalls to design around: ${params.approach.pitfalls.join(' · ')}`,
          `Topics they selected: ${params.selectedTopics.length > 0 ? params.selectedTopics.join(', ') : '(none selected)'}`,
          ...(params.unselectedTopics && params.unselectedTopics.length > 0
            ? [`Topics shown but not selected: ${params.unselectedTopics.join(', ')}`]
            : []),
        ].join('\n'),
      },
    ],
  }),
}
