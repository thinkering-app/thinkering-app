import { z } from 'zod'
import { routineOutputSchema, type RoutineOutput } from '../../schemas/generations'
import { SECTIONS } from '../../domain'
import { libraryReference, SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G11 `routine.customize` — "How would you want to customize your learning
 * routine?" (docs/01 §3) turned into library activations plus a preference note
 * that later generation calls carry as context.
 */

export const routineCustomizeParamsSchema = z.object({
  interestName: z.string(),
  wantToLearn: z.string(),
  domain: z.string().optional(),
  request: z.string().min(1),
  /** Current activation state, per section, of every item offered there. */
  current: z.array(
    z.object({
      section: z.enum(SECTIONS),
      libraryItemId: z.string(),
      name: z.string(),
      active: z.boolean(),
    }),
  ),
  /** Notes already saved, so a new request refines rather than contradicts. */
  existingNotes: z.array(z.string()).optional(),
})
export type RoutineCustomizeParams = z.infer<typeof routineCustomizeParamsSchema>

const INSTRUCTIONS = `Task: interpret how the learner wants their daily routine to change, and express it as library-item activations plus one preference note.

Return JSON: {
  "activations": [{ "section": "next"|"strengthen"|"go_further", "libraryItemId": string, "active": boolean }],
  "note": string
}

Rules:
- Only include activations you are actually changing. An empty list is correct when the request is purely about tone, difficulty, or content rather than which strategies run.
- Only use library item ids listed as available for that section. Never turn off every item in a section — at least one must stay active.
- The note is the durable instruction to later generation calls: one or two plain sentences in the learner's terms ("Prefers speaking practice over grammar drills"). It doubles as the confirmation shown to them, so make it true and readable, not a summary of your reasoning.
- If the request is vague, make the smallest sensible change and say what you did in the note.

${libraryReference()}`

export const routineCustomizeTemplate: PromptTemplate<RoutineCustomizeParams, RoutineOutput> = {
  kind: 'routine.customize',
  version: 1,
  model: 'haiku',
  maxTokens: 800,
  temperature: 0.2,
  paramsSchema: routineCustomizeParamsSchema,
  outputSchema: routineOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          `Interest: ${params.interestName} — wants to learn: ${params.wantToLearn}`,
          ...(params.domain ? [`Domain: ${params.domain}`] : []),
          '',
          'Current routine:',
          ...SECTIONS.map(
            (section) =>
              `- ${section}: ${params.current
                .filter((c) => c.section === section)
                .map((c) => `${c.libraryItemId} (${c.name}) ${c.active ? 'ON' : 'off'}`)
                .join(', ')}`,
          ),
          ...(params.existingNotes && params.existingNotes.length > 0
            ? ['', 'Notes they have already set:', ...params.existingNotes.map((n) => `- ${n}`)]
            : []),
          '',
          `Their request: ${params.request}`,
        ].join('\n'),
      },
    ],
  }),
}
