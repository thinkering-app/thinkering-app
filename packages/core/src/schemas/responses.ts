import { z } from 'zod'
import type { InteractiveBlockKind } from './blocks'

/**
 * What an interaction records into `responses.payload` (docs/03, docs/05 —
 * "responses save immediately on interaction"). One payload shape per
 * interactive block kind, discriminated by `kind` so the row can be read back
 * without consulting the document: the player restores answers from it on
 * resume, and G6 summarizes it for the review page.
 */

export const responsePayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), selectedId: z.string(), correct: z.boolean().nullable() }),
  z.object({ kind: z.literal('freeText'), text: z.string() }),
  z.object({
    kind: z.literal('fillBlank'),
    /** Blank id → what they typed. */
    answers: z.record(z.string(), z.string()),
    correct: z.boolean(),
  }),
  z.object({ kind: z.literal('ordering'), order: z.array(z.string()), correct: z.boolean() }),
  z.object({
    kind: z.literal('matching'),
    /** Left id → the right id they paired it with. */
    pairs: z.record(z.string(), z.string()),
    correct: z.boolean(),
  }),
  z.object({ kind: z.literal('reveal'), revealed: z.literal(true) }),
  z.object({ kind: z.literal('selfRate'), selectedId: z.string() }),
])

export type ResponsePayload = z.infer<typeof responsePayloadSchema>
export type ResponsePayloadFor<K extends InteractiveBlockKind> = Extract<ResponsePayload, { kind: K }>

export function parseResponsePayload(value: unknown): ResponsePayload | undefined {
  const parsed = responsePayloadSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}
