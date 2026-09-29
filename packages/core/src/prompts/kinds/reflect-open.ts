import { z } from 'zod'
import { cappedText } from '../../limits'
import { reflectOpenOutputSchema, type ReflectOpenOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G8a `reflect.open` — fired as the reflection flow opens (docs/01 §5). Its
 * outcomes join the ones they hold on the first step; its recap sits above the
 * question on the second. Nothing waits on it: both simply appear when ready.
 */

export const reflectOpenParamsSchema = z.object({
  context: interestContextInputSchema,
  topics: z.array(cappedText('line')).optional(),
})
export type ReflectOpenParams = z.infer<typeof reflectOpenParamsSchema>

const INSTRUCTIONS = `Task: the learner is about to reflect on their learning. Prepare two things for them.

Return JSON: { "recap": string, "outcomes": string[] }

"recap": what and how they've been learning lately, addressed to them as "you". At most two sentences and 40 words. Say which goals they've been working on, what kind of practice (meeting new ground, strengthening it, putting it to use), and anything their ratings suggest. Describe only what their recent activity shows — no praise, no verdict on their method, no advice. If there's no recent activity, say so plainly in one sentence.

"outcomes": 2–3 more outcomes they could add to what they're hoping for, in their own voice: "I can…", "I understand…", "I've made…", "I feel confident…".
- Each is 3–10 words (under 60 characters), sentence case, no trailing period. "I can sketch a face from memory" is the right size.
- Draw on what they've actually been doing and why they're learning: reach a little past where they are now, reachable in weeks to months.
- Never repeat or lightly rephrase one they already hold. Vary the kind: understanding, doing, making, a real moment in their life, confidence or habit.`

export const reflectOpenTemplate: PromptTemplate<ReflectOpenParams, ReflectOpenOutput> = {
  kind: 'reflect.open',
  // v2: saved resources in the context arrive inside <resource_notes> tags,
  // named as material, not instructions — their notes were drafted from web pages.
  version: 2,
  model: 'haiku',
  maxTokens: 600,
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
