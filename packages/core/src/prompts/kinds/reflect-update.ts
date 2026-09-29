import { z } from 'zod'
import { cappedText } from '../../limits'
import { reflectUpdateOutputSchema, type ReflectUpdateOutput } from '../../schemas/generations'
import { GOAL_STATUSES } from '../../domain'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G8 `reflect.update` — the reflection flow (docs/01 §5). The learner says how
 * their learning feels and what they want next; this proposes edits to the
 * path. Every proposal is a suggestion the learner accepts or ignores, so each
 * one carries a reason in their terms.
 */

export const reflectUpdateParamsSchema = z.object({
  context: interestContextInputSchema,
  sessionMinutes: z.number().int().positive(),
  /** What they wrote in step 1 of the flow. */
  feelingText: cappedText('long', { min: 1 }),
  /** The path, with the short refs the response must use. */
  goals: z.array(
    z.object({
      ref: cappedText('line', { min: 1 }),
      title: cappedText('line'),
      description: cappedText('note'),
      status: z.enum(GOAL_STATUSES),
    }),
  ),
  topics: z.array(cappedText('line')).optional(),
})
export type ReflectUpdateParams = z.infer<typeof reflectUpdateParamsSchema>

const INSTRUCTIONS = `Task: read the learner's reflection and propose how their path should change.

Return JSON: {
  "observations": string,      // 2–3 plain sentences on what their reflection says about where they are and what they want next
  "suggestedChanges": [        // edits to goals already on their path; only where the reflection warrants one
    { "type": "revise", "ref": string, "title": string, "description": string, "reason": string },
    { "type": "remove", "ref": string, "reason": string },
    { "type": "reorder", "ref": string, "afterRef": string|null, "reason": string }   // afterRef null = move it to the front
  ],
  "suggestedGoals": [          // new goals, 0–3
    { "title": string, "description": string,
      "concepts": [{ "label": string, "kind": "concept"|"skill" }],   // 2–4, 2–5 words each
      "afterRef": string|null,   // the goal it should follow; null = the front of the path
      "reason": string }
  ]
}

Rules:
- Refer to existing goals only by the refs listed below. Never invent a ref.
- Propose only what the reflection actually supports. An empty "suggestedChanges" is the right answer when their path already fits what they said; say so in the observations.
- Prefer reordering or revising over removing for a goal they have already started — their progress on it is real.
- They have just confirmed what they're hoping for ("What would feel like success" above). Favor changes that move them toward it; an outcome no goal on the path serves is a good reason to suggest one. In a reason, call it what they're hoping for, never "success".
- Every "reason" is one line the learner reads, in their terms, about their learning — not about your reasoning.
- New goals follow the same rules as the rest of the path: one session each, outcome-flavored titles, sequenced so prerequisites come first.
- Speak to what they wrote. Never imply their knowledge is limited to what they have done in this app.`

export const reflectUpdateTemplate: PromptTemplate<ReflectUpdateParams, ReflectUpdateOutput> = {
  kind: 'reflect.update',
  // v4: saved resources in the context arrive inside <resource_notes> tags,
  // named as material, not instructions — their notes were drafted from web pages.
  version: 4,
  model: 'sonnet',
  maxTokens: 8000,
  effort: 'low',
  paramsSchema: reflectUpdateParamsSchema,
  outputSchema: reflectUpdateOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          buildInterestContext(params.context),
          '',
          `Session length: ${params.sessionMinutes} minutes`,
          ...(params.topics && params.topics.length > 0
            ? [`Topics they are interested in: ${params.topics.join(', ')}`]
            : []),
          '',
          'Their path, by ref:',
          ...params.goals.map((g) => `- ${g.ref} [${g.status}] ${g.title} — ${g.description}`),
          '',
          `Their reflection: ${params.feelingText}`,
        ].join('\n'),
      },
    ],
  }),
}
