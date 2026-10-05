import { z } from 'zod'
import { cappedText } from '../../limits'
import { reflectOpenOutputSchema, type ReflectOpenOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G8a `reflect.open` — fired as the reflection flow opens (docs/01 §5). Its
 * recap sits above the question. Nothing waits on it: it simply appears when
 * ready.
 */

export const reflectOpenParamsSchema = z.object({
  context: interestContextInputSchema,
  topics: z.array(cappedText('line')).optional(),
})
export type ReflectOpenParams = z.infer<typeof reflectOpenParamsSchema>

const INSTRUCTIONS = `Task: the learner is about to reflect on their learning. Recap it for them.

Return JSON: { "recap": string }

"recap": what and how they've been learning lately, addressed to them as "you". At most two sentences and 40 words. Say which goals they've been working on, what kind of practice (meeting new ground, strengthening it, putting it to use), and anything their ratings suggest. Describe only what their recent activity shows — no praise, no verdict on their method, no advice. If there's no recent activity, say so plainly in one sentence.`

export const reflectOpenTemplate: PromptTemplate<ReflectOpenParams, ReflectOpenOutput> = {
  kind: 'reflect.open',
  version: 2,
  model: 'haiku',
  maxTokens: 300,
  temperature: 0.3,
  paramsSchema: reflectOpenParamsSchema,
  outputSchema: reflectOpenOutputSchema,
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
          ...(params.topics && params.topics.length > 0
            ? ['', `Topics they are interested in: ${params.topics.join(', ')}`]
            : []),
        ].join('\n'),
      },
    ],
  }),
}
