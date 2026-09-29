import { z } from 'zod'
import { cappedText, trimmedText } from '../../limits'
import { resourcesSearchOutputSchema, type ResourcesSearchOutput } from '../../schemas/generations'
import { buildInterestContext, interestContextInputSchema } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import { excludeUrlLines, RESOURCE_JSON, RESOURCE_RULES } from '../resource-rules'
import type { PromptTemplate } from '../types'

/**
 * G4 `resources.search` — fires once intake completes and runs fully in the
 * background; resources appear when they appear (docs/04). One of the two
 * kinds that use the web search tool, because "reputable and current" can't
 * come from the model's memory.
 *
 * Exactly two: the cheapest search that still leaves early activities usable.
 * `watch-along` wants a video and `guided-reading` wants an article, both are
 * active by default, and `pickResource` falls back to whatever is there when
 * the media it wants is missing — so a lone article turns every Watch Along
 * into a reading. A pair costs one search more than a single and is the
 * difference between seeding something usable and something that degrades.
 * Anything beyond the pair is the learner's to ask for (G12).
 */

export const resourcesSearchParamsSchema = z.object({
  context: interestContextInputSchema,
  /** Exact goal titles — matches must come back as one of these. */
  goalTitles: z.array(cappedText('line')).min(1),
  topics: z.array(cappedText('line')).optional(),
  /** Saved resource URLs, so a re-run doesn't hand back what they have. */
  excludeUrls: z.array(trimmedText(2_000)).optional(),
})
export type ResourcesSearchParams = z.infer<typeof resourcesSearchParamsSchema>

const INSTRUCTIONS = `Task: find the two resources this learner should start with, using web search.

${RESOURCE_JSON}

Rules:
- Exactly two resources: one thing to watch, one thing to read. Not one, not three.
- A starting point, not a reading list. They can ask for more whenever they want, so pick the two that earn their place now rather than covering the path.
- The pair has to be usable immediately: early activities are built around one specific video or one specific article, so aim them at the goals the learner reaches first.
${RESOURCE_RULES}`

export const resourcesSearchTemplate: PromptTemplate<ResourcesSearchParams, ResourcesSearchOutput> =
  {
    kind: 'resources.search',
    // v6: search results are named as material, never instructions (RESOURCE_RULES), and
    // saved resources in the context arrive inside <resource_notes> tags.
    version: 6,
    model: 'sonnet',
    maxTokens: 16000,
    effort: 'medium',
    tools: { webSearch: { maxUses: 2 } },
    paramsSchema: resourcesSearchParamsSchema,
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
