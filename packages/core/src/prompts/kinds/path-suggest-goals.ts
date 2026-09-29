import { z } from 'zod'
import { cappedText } from '../../limits'
import { suggestedGoalsOutputSchema, type SuggestedGoalsOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G9 `path.suggestGoals` — the three suggestions at the bottom of Path (docs/01
 * §5), one tap to add. Cached per path signature: the path changing is what
 * makes them stale, not the learner's progress through it.
 */

export const pathSuggestGoalsParamsSchema = z.object({
  context: interestContextInputSchema,
  sessionMinutes: z.number().int().positive(),
  /** Topics they picked at intake (and added since) — adjacent ground worth mining. */
  topics: z.array(cappedText('line')).optional(),
})
export type PathSuggestGoalsParams = z.infer<typeof pathSuggestGoalsParamsSchema>

const INSTRUCTIONS = `Task: suggest three goals this learner could add to their path.

Return JSON: {
  "goals": [{
    "title": string,                 // outcome-flavored, like the goals already on their path
    "description": string,           // what it covers, one or two plain sentences, 30 words at most
    "concepts": [{ "label": string, "kind": "concept"|"skill" }]   // 2–4 items, 2–5 words each — they render as chips
  }]
}

Rules:
- Exactly three, each introducible in one session of their stated length.
- None may duplicate or lightly rephrase a goal already on their path. They are additions, not a rewrite.
- Aim for one of each, in this order: something that fills a gap in what's there, something that goes deeper on ground they've already covered, and something adjacent that would genuinely interest them given their topics and why.
- Suggest what fits this learner — their domain, experience and the direction their path already takes. No generic "learn the basics of X" filler.`

export const pathSuggestGoalsTemplate: PromptTemplate<
  PathSuggestGoalsParams,
  SuggestedGoalsOutput
> = {
  kind: 'path.suggestGoals',
  // v3: saved resources in the context arrive inside <resource_notes> tags,
  // named as material, not instructions — their notes were drafted from web pages.
  version: 3,
  model: 'haiku',
  maxTokens: 1200,
  temperature: 0.7,
  paramsSchema: pathSuggestGoalsParamsSchema,
  outputSchema: suggestedGoalsOutputSchema,
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
        ].join('\n'),
      },
    ],
  }),
}
