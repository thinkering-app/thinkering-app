import { z } from 'zod'
import { cappedText } from '../../limits'
import { approachParamSchema } from './intake-approach'
import { choicesOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G2 `intake.choices` — RETIRED, split into `intake.outcomes` and
 * `intake.topicOptions` (docs/04 §Retired kinds) so step 4 waits only on the
 * short outcomes call. Kept unchanged for installs shipped before the split,
 * which fire it on step 3 → 4. Byte-identical to what those builds were
 * compiled against — do not edit it or bump its version. Delete it once those
 * builds are gone.
 */

export const intakeChoicesParamsSchema = z.object({
  wantToLearn: cappedText('wantToLearn', { min: 1 }),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: cappedText('note').optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: cappedText('note').optional(),
  approach: approachParamSchema,
})
export type IntakeChoicesParams = z.infer<typeof intakeChoicesParamsSchema>

const INSTRUCTIONS = `Task: propose what the learner will pick from on the next two questions — topics, then what they're hoping for.

Return JSON, with "topics" first: {
  "topics": [{ "label": string, "origin": "motivation"|"foundational"|"adjacent", "blurb": string }],
  "outcomes": [string]
}

Topics ("Which topics feel most relevant?"). Mix three origins — the mix is invisible to the user:
- "motivation": directly aligned with why they're learning this
- "foundational": prerequisites/basics their experience level suggests they need
- "adjacent": nearby-but-interesting territory that keeps the path fresh
Labels: 2–5 words, chip-sized, concrete, no jargon the learner wouldn't recognize at their level. Blurb: one plain sentence on what this covers. 9–12 topics, no near-duplicates.

Outcomes ("What are you hoping for?"). They pick any that fit, or none.
3–5 outcomes. Each is first person, in the learner's own voice: "I can…", "I understand…", "I've made…", "I feel confident…". 3–10 words, sentence case, no trailing period.
Make them genuinely varied, and a bit longer term — cover different kinds of success, not one kind restated: understanding something, doing something, making or finishing something, a real moment in their life tied to why they're learning, and confidence or habit. Concrete and specific to what they told you, and pitched to their experience: reachable in weeks to months, not years.
Outcomes are not topics restated: a topic is something to study, an outcome is what being further along feels like.`

export const intakeChoicesTemplate: PromptTemplate<
  IntakeChoicesParams,
  z.infer<typeof choicesOutputSchema>
> = {
  kind: 'intake.choices',
  version: 1,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: intakeChoicesParamsSchema,
  outputSchema: choicesOutputSchema,
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
