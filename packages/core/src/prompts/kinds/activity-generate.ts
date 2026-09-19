import { z } from 'zod'
import { activityDocSchema, type ActivityDoc } from '../../schemas/activity-doc'
import { resourceMediaOf } from '../../activity/resources'
import { buildInterestContext, type InterestContextInput } from '../context-assembly'
import { ACTIVITY_DOC_FORMAT, libraryReference, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G5b `activity.generate` — the full Activity Document, streamed so page 1
 * renders as soon as it parses. The review page must be emitted empty
 * (blocks: null); G6 fills it later.
 */

export const activityGenerateParamsSchema = z.object({
  context: z.custom<InterestContextInput>((v) => typeof v === 'object' && v !== null),
  goal: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.string(),
    concepts: z.array(
      z.object({ id: z.string(), label: z.string(), kind: z.enum(['concept', 'skill']) }),
    ),
  }),
  tier: z.enum(['introduce', 'strengthen', 'apply']),
  libraryItemId: z.string(),
  title: z.string(),
  estMinutes: z.number().int().positive(),
  /** For usesResources items: the matched resource. */
  resource: z
    .object({
      id: z.string(),
      url: z.string(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      howToUse: z.string().nullable().optional(),
    })
    .optional(),
  /** What the learner asked this activity to focus on, or how they want to learn it (the + card). */
  focus: z.string().optional(),
  /** Prerequisite-fallback cards carry a topic instead of a goal elsewhere; here goal is always present. */
})
export type ActivityGenerateParams = z.infer<typeof activityGenerateParamsSchema>

const INSTRUCTIONS = `Task: write one complete Activity Document for the given goal, tier, and library item.

${ACTIVITY_DOC_FORMAT}

Additional rules for this task:
- Emit pages in reading order, page 1 first (it renders while you're still writing).
- End every document with exactly these two pages, in this order and with these kinds:
  { "id": "review", "kind": "review", "blocks": null },
  { "id": "summary", "kind": "summary", "blocks": [ …2–3 recap blocks, no interaction… ] }
  The summary is "kind": "summary", not "content" — a content page would fail validation.
- "concepts": declare which of the goal's concept/skill ids this activity genuinely targets (use their exact ids in goalConceptId). Don't claim coverage you don't deliver.
- Ground apply-tier activities in the learner's contexts and resources only when they genuinely fit — never force it.
- If a resource is provided, build around it with resourceEmbed blocks carrying its exact url, resourceId and media: short segments, focus prompts, interaction after each segment. Never "watch this 20-minute video". Embed no other video.
- Without a provided resource, don't embed a video or send the learner off to find one — no channels, no "search YouTube for". Teach it on the page instead.
- estMinutes and page count must match the requested session length.
- Use the provided card title as the document title unless it's clearly wrong for the content you wrote.
- If the learner made a request for this activity, honour it: it says what to focus on or how they want to learn it. Stay within the tier and the library item's shape.

${libraryReference()}`

export const activityGenerateTemplate: PromptTemplate<ActivityGenerateParams, ActivityDoc> = {
  kind: 'activity.generate',
  // v2: the block format spells out the "kind" discriminator — models were
  // emitting "type" and every document needed a repair round-trip.
  // v3: thinking stated explicitly (docs/04 §Thinking).
  // v4: the matched resource arrives with its id, url and media, and videos
  // are embedded from it only — cards were pointing at YouTube channels.
  // v5: the learner's own request, from the + card.
  version: 5,
  model: 'sonnet',
  // Thinking plus the document: a 10-minute activity ran ~5.6k at high effort,
  // and 15-minute ones need the room.
  maxTokens: 16000,
  // High effort measurably teaches better — it builds the discovery around a
  // test case where low effort hands over the rule — and the Next card is
  // prefetched, which hides most of the wait (docs/04 §Thinking).
  effort: 'high',
  paramsSchema: activityGenerateParamsSchema,
  outputSchema: activityDocSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          buildInterestContext(params.context, { includeContexts: params.tier === 'apply' }),
          '',
          `Generate this activity:`,
          `- Card title: ${params.title}`,
          `- Tier: ${params.tier} · Library item: ${params.libraryItemId} · estMinutes: ${params.estMinutes}`,
          `- Goal: ${params.goal.title} — ${params.goal.description} (status: ${params.goal.status})`,
          `- Goal concepts: ${params.goal.concepts.map((c) => `${c.id} = ${c.label} (${c.kind})`).join(', ')}`,
          ...(params.resource
            ? [
                `- Resource to build around: ${params.resource.title} · resourceId: ${params.resource.id} · url: ${params.resource.url} · media: ${resourceMediaOf(params.resource.url)}${params.resource.howToUse ? ` · use: ${params.resource.howToUse}` : ''}${params.resource.summary ? `\n  Summary: ${params.resource.summary}` : ''}`,
              ]
            : []),
          ...(params.focus ? [`- Learner's request: "${params.focus}"`] : []),
        ].join('\n'),
      },
    ],
  }),
}
