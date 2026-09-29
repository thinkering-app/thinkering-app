import { z } from 'zod'
import { cappedText, trimmedText } from '../../limits'
import { resourcesSearchOutputSchema, type ResourcesSearchOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import { excludeUrlLines, RESOURCE_JSON, RESOURCE_RULES, searchBudgetRule } from '../resource-rules'
import type { PromptTemplate } from '../types'

/**
 * G12 `resources.more` — Find more, in the resources panel. The half of
 * resource searching the learner asks for, against G4's two-item seed.
 *
 * A separate kind rather than a parameter on G4 because the two differ in
 * their search budget, and `tools` is a template field: request fields come
 * only from `modelRequestFields` (docs/04), never from a call site. They also
 * differ in intent — G4 seeds what early activities need, this ranges over the
 * whole path — which is enough to want its own brief and its own version.
 *
 * Deliberate, so it can spend more than G4, but still background: a search
 * runs for minutes, so the panel doesn't wait on it (docs/01 §5).
 */

export const resourcesMoreParamsSchema = z.object({
  context: interestContextInputSchema,
  /** Exact goal titles — matches must come back as one of these. */
  goalTitles: z.array(cappedText('line')).min(1),
  topics: z.array(cappedText('line')).optional(),
  /** Every saved URL. Asking for more is asking for what they don't have. */
  excludeUrls: z.array(trimmedText(2_000)).optional(),
})
export type ResourcesMoreParams = z.infer<typeof resourcesMoreParamsSchema>

const MAX_SEARCHES = 4

const INSTRUCTIONS = `Task: find more resources for a learner who has some already and asked for others, using web search.

${RESOURCE_JSON}

Rules:
- Two to four resources, across the whole path — not only the goals they start with. Later goals are usually the ones still missing something.
- They asked for more, so bring them somewhere they haven't been. A resource from a site they already have, covering ground they already have, is not more.
- Vary what they are and where they come from. Never two from the same site, and not all of one kind.
${RESOURCE_RULES}
${searchBudgetRule(MAX_SEARCHES)}`

export const resourcesMoreTemplate: PromptTemplate<ResourcesMoreParams, ResourcesSearchOutput> = {
  kind: 'resources.more',
  // v2: search results are named as material, never instructions (RESOURCE_RULES).
  // v3: told its search budget (searchBudgetRule), and low effort, as G4 v7.
  version: 3,
  model: 'sonnet',
  maxTokens: 16000,
  effort: 'low',
  tools: { webSearch: { maxUses: MAX_SEARCHES } },
  paramsSchema: resourcesMoreParamsSchema,
  outputSchema: resourcesSearchOutputSchema,
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
          'Goal titles to match against, exactly:',
          ...params.goalTitles.map((t) => `- ${t}`),
          ...(params.topics && params.topics.length > 0
            ? ['', `Topics they are interested in: ${params.topics.join(', ')}`]
            : []),
          ...excludeUrlLines(params.excludeUrls),
        ].join('\n'),
      },
    ],
  }),
}
