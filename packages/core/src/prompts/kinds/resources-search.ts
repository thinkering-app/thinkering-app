import { z } from 'zod'
import { resourcesSearchOutputSchema, type ResourcesSearchOutput } from '../../schemas/generations'
import { buildInterestContext, type InterestContextInput } from '../context-assembly'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G4 `resources.search` — fires once intake completes and runs fully in the
 * background; resources appear when they appear (docs/04). The only kind that
 * uses the web search tool, because "reputable and current" can't come from
 * the model's memory.
 */

export const resourcesSearchParamsSchema = z.object({
  context: z.custom<InterestContextInput>((v) => typeof v === 'object' && v !== null),
  /** Exact goal titles — matches must come back as one of these. */
  goalTitles: z.array(z.string()).min(1),
  topics: z.array(z.string()).optional(),
})
export type ResourcesSearchParams = z.infer<typeof resourcesSearchParamsSchema>

const INSTRUCTIONS = `Task: find genuinely good articles and videos for this learner's path, using web search.

Return JSON (and nothing else after your searches): {
  "resources": [{
    "url": string,            // the real, working URL you found
    "title": string,          // the resource's own title
    "description": string,    // one or two lines: what it is and why it's worth their time
    "howToUse": string,       // one or two lines on how to use it alongside their goals — watch for X, try Y after reading
    "summary": string,        // a fuller summary for later activity generation; the learner never sees it
    "goalTitles": [string]    // the goals it serves, copied exactly from the list below; [] if it serves the path generally
  }]
}

Rules:
- Search before answering. Two to four resources, spread across their goals rather than piled on one.
- A starting point, not a reading list: enough that they have something good to reach for, no more.
- Reputable and specific: a well-regarded explainer, documentation, a course page, a good YouTube video. No SEO filler, no listicles, no aggregator pages, nothing behind a hard paywall.
- Only include a URL you actually saw in search results. Never construct or guess one.
- Match their level and their session length: something that takes an hour is fine as a resource, but say so in how-to-use.
- Copy goal titles exactly. A resource that fits no single goal gets an empty list rather than a wrong one.`

export const resourcesSearchTemplate: PromptTemplate<ResourcesSearchParams, ResourcesSearchOutput> =
  {
    kind: 'resources.search',
    version: 3,
    model: 'sonnet',
    maxTokens: 16000,
    effort: 'medium',
    tools: { webSearch: { maxUses: 4 } },
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
          ].join('\n'),
        },
      ],
    }),
  }
