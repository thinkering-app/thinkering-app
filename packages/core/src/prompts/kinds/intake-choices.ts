import { z } from 'zod'
import { approachOutputSchema, choicesOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G2 `intake.choices` — fired on intake step 3 → 4; consumes G1's output.
 * Produces both of the chip sets intake offers: topics for step 4 and
 * outcomes for step 5. These were two calls (G2 and G2b) taking identical
 * params, which meant paying for the same reasoning about the learner twice;
 * outcomes now also get G1's domain notes, which they never had.
 *
 * Step 5 does not wait on step 4: `topics` is emitted first and the client
 * renders it as the array closes (extractPartialTopics).
 */

export const intakeChoicesParamsSchema = z.object({
  wantToLearn: z.string().min(1),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: z.string().optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: z.string().optional(),
  approach: approachOutputSchema,
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
