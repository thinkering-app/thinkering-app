import type { z } from 'zod'
import type {
  fillBlankBlockSchema,
  matchingBlockSchema,
  mcqBlockSchema,
  orderingBlockSchema,
} from '../schemas/blocks'

/**
 * Correctness for the interactive blocks that have a right answer (docs/05).
 * Pure so the renderer can stay a renderer, and so "was that right?" is decided
 * the same way in the player, in the feedback it shows, and in what G6 is told.
 */

type McqBlock = z.infer<typeof mcqBlockSchema>
type FillBlankBlock = z.infer<typeof fillBlankBlockSchema>
type OrderingBlock = z.infer<typeof orderingBlockSchema>
type MatchingBlock = z.infer<typeof matchingBlockSchema>

/** Null when the block has no `correctId` — opinion-style questions aren't graded. */
export function gradeMcq(block: McqBlock, selectedId: string): boolean | null {
  return block.correctId === undefined ? null : block.correctId === selectedId
}

/** Blanks are forgiving: case- and whitespace-insensitive, `alts` count as right. */
export function gradeBlank(blank: FillBlankBlock['blanks'][number], answer: string): boolean {
  const normalize = (s: string) => s.trim().toLowerCase()
  const given = normalize(answer)
  return given.length > 0 && [blank.answer, ...(blank.alts ?? [])].some((a) => normalize(a) === given)
}

export function gradeFillBlank(block: FillBlankBlock, answers: Record<string, string>): boolean {
  return block.blanks.every((b) => gradeBlank(b, answers[b.id] ?? ''))
}

export function gradeOrdering(block: OrderingBlock, order: readonly string[]): boolean {
  return order.length === block.correctOrder.length && order.every((id, i) => id === block.correctOrder[i])
}

/** Pairs are matched left id → right id; correct when every left holds its own right. */
export function gradeMatching(block: MatchingBlock, pairs: Record<string, string>): boolean {
  return block.pairs.every((p) => pairs[p.leftId] === p.rightId)
}
