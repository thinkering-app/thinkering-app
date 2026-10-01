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

/**
 * Blanks are forgiving: they ignore case, spacing, hyphens and punctuation at
 * either end, and an article the other side doesn't have ("the mitochondria"
 * for "mitochondria"); `alts` count as right. In an answer of eight letters or
 * more, one typo — a letter missing, extra, wrong or swapped with its
 * neighbour — still counts. Shorter answers and anything with a digit must
 * match, so "affect" isn't "effect" and 1914 isn't 1915.
 */
export function gradeBlank(blank: FillBlankBlock['blanks'][number], answer: string): boolean {
  const given = normalizeBlank(answer)
  return given.length > 0 && [blank.answer, ...(blank.alts ?? [])].some((a) => sameBlank(a, given))
}

function sameBlank(expected: string, given: string): boolean {
  const want = normalizeBlank(expected)
  if (want === given) return true
  if (dropArticle(want) === given || want === dropArticle(given)) return true
  return want.length >= 8 && !/\d/.test(want) && withinOneEdit(want, given)
}

function normalizeBlank(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-‐–—]+/g, ' ')
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
}

function dropArticle(text: string): string {
  const rest = text.replace(/^(a|an|the) /, '')
  return rest.length > 0 ? rest : text
}

/** One insertion, deletion, substitution or adjacent swap turns `a` into `b`. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

export function gradeFillBlank(block: FillBlankBlock, answers: Record<string, string>): boolean {
  return block.blanks.every((b) => gradeBlank(b, answers[b.id] ?? ''))
}

export function gradeOrdering(block: OrderingBlock, order: readonly string[]): boolean {
  return (
    order.length === block.correctOrder.length &&
    order.every((id, i) => id === block.correctOrder[i])
  )
}

/** Pairs are matched left id → right id; correct when every left holds its own right. */
export function gradeMatching(block: MatchingBlock, pairs: Record<string, string>): boolean {
  return block.pairs.every((p) => pairs[p.leftId] === p.rightId)
}
