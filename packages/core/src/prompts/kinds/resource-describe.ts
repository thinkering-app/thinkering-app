import { z } from 'zod'
import { cappedText, trimmedText } from '../../limits'
import {
  resourceDescribeOutputSchema,
  type ResourceDescribeOutput,
} from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G10 `resource.describe` — the learner pastes a link, the proxy fetches the
 * page, and this drafts the fields they then edit (docs/01 §5). Inline and
 * fast: a draft they have to fix is better than a wait.
 */

export const resourceDescribeParamsSchema = z.object({
  url: z.string().url().max(2_000),
  /** The page's own title, when the fetch found one. */
  pageTitle: cappedText('line').optional(),
  /** Readable page text, already truncated by the fetch. */
  pageText: trimmedText(10_000, { min: 1 }),
  interestName: cappedText('line'),
  wantToLearn: cappedText('wantToLearn'),
  goalTitles: z.array(cappedText('line')),
})
export type ResourceDescribeParams = z.infer<typeof resourceDescribeParamsSchema>

const INSTRUCTIONS = `Task: describe a resource the learner saved, from the page text.

Return JSON: {
  "title": string,          // the resource's own title, tidied; not a sentence about it
  "description": string,    // one or two lines: what it is and what it covers
  "howToUse": string,       // one or two lines on how it fits their learning — what to watch for, what to try after
  "summary": string,        // a fuller summary for later activity generation; the learner never sees it
  "goalTitles": [string]    // the goals it serves, copied exactly from the list below; [] if none fits
}

Rules:
- Describe what the page actually contains. If the text is thin or looks like a paywall or error page, say so plainly in the description rather than inventing content.
- The summary is the part that feeds later generation: concrete specifics — what it teaches, in what order, with what examples.
- Copy goal titles exactly, or return an empty list.`

export const resourceDescribeTemplate: PromptTemplate<
  ResourceDescribeParams,
  ResourceDescribeOutput
> = {
  kind: 'resource.describe',
  version: 1,
  model: 'haiku',
  maxTokens: 1200,
  temperature: 0.2,
  paramsSchema: resourceDescribeParamsSchema,
  outputSchema: resourceDescribeOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          `Learner's interest: ${params.interestName} — wants to learn: ${params.wantToLearn}`,
          `Their goals: ${params.goalTitles.join(' · ') || '(none yet)'}`,
          '',
          `URL: ${params.url}`,
          ...(params.pageTitle ? [`Page title: ${params.pageTitle}`] : []),
          '',
          'Page text:',
          params.pageText,
        ].join('\n'),
      },
    ],
  }),
}
