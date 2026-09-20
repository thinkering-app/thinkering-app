import { pageToPlainText } from '../activity/describe'
import type { ActivityDoc } from '../schemas/activity-doc'
import { isInteractiveBlock, type Block } from '../schemas/blocks'

/**
 * Structural and tone assertions shared by `pnpm prompt:check` and tests
 * (docs/10 Tier 5): structure, never string equality. Quality judgment stays
 * human (AI Inspector).
 */

export interface CheckIssue {
  check: string
  message: string
}

/** Phrases generated content must never contain (docs/04 tone rules). */
const TONE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /great job/i, label: 'filler praise ("Great job")' },
  {
    pattern: /you haven'?t (yet )?(learned|covered|studied|done)/i,
    label: 'patronizing "you haven\'t learned X" framing',
  },
  { pattern: /awesome!|amazing!|fantastic!/i, label: 'exclamation-mark cheerleading' },
]

export function toneLintIssues(text: string, where: string): CheckIssue[] {
  const issues: CheckIssue[] = []
  for (const { pattern, label } of TONE_PATTERNS) {
    const match = text.match(pattern)
    if (match) issues.push({ check: 'tone', message: `${where}: ${label} — "${match[0]}"` })
  }
  return issues
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out)
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) collectStrings(v, out)
}

/** Tone-lint every string in a generation output. */
export function toneLintOutput(output: unknown, where = 'output'): CheckIssue[] {
  const strings: string[] = []
  collectStrings(output, strings)
  return strings.flatMap((s) => toneLintIssues(s, where))
}

/**
 * Word budgets for the two short pages at the end of an activity (docs/05).
 * Both are read on a phone after the work is done, and both drift long: the
 * budget is the assertion, because a bloated page is structurally valid.
 */
export const REVIEW_MAX_WORDS = 45
export const SUMMARY_MAX_WORDS = 40

/** Learner-facing words in a list of blocks — markup and our ids dropped. */
export function blockWordCount(blocks: readonly Block[]): number {
  return pageToPlainText({ blocks: [...blocks] })
    .split(/\s+/)
    .filter(Boolean).length
}

/**
 * G6's review page: one short paragraph saying one thing. Length and shape are
 * the whole check — the schema accepts any blocks, and a lesson is what the
 * model reaches for unprompted.
 */
export function checkReviewBlocks(blocks: readonly Block[], where = 'review'): CheckIssue[] {
  const issues: CheckIssue[] = []
  const words = blockWordCount(blocks)
  if (words > REVIEW_MAX_WORDS) {
    issues.push({
      check: 'review-length',
      message: `${where}: ${words} words (budget ${REVIEW_MAX_WORDS})`,
    })
  }
  const other = blocks.filter((b) => b.kind !== 'paragraph').map((b) => b.kind)
  if (other.length > 0) {
    issues.push({
      check: 'review-shape',
      message: `${where}: paragraphs only, got ${other.join(', ')}`,
    })
  }
  if (blocks.length > 1) {
    issues.push({
      check: 'review-shape',
      message: `${where}: ${blocks.length} blocks (expected one)`,
    })
  }
  issues.push(...toneLintOutput(blocks, where))
  return issues
}

/** Page-count range for a session length: 3–7 for 5 minutes, scaling with estMinutes. */
export function pageCountRange(estMinutes: number): { min: number; max: number } {
  const scale = Math.max(0, Math.ceil((estMinutes - 5) / 5))
  return { min: 3, max: 7 + 2 * scale }
}

/**
 * Structural checks for a G5b Activity Document beyond what the Zod schema
 * enforces: page-count range for the session length, the reserved (empty)
 * review page second-to-last, declared concepts resolving to real goal
 * concepts, the summary recap's word budget, and tone lints.
 */
export function checkActivityDoc(
  doc: ActivityDoc,
  opts: { estMinutes: number; goalConceptIds: readonly string[]; libraryItemId?: string },
): CheckIssue[] {
  const issues: CheckIssue[] = []

  const { min, max } = pageCountRange(opts.estMinutes)
  if (doc.pages.length < min || doc.pages.length > max) {
    issues.push({
      check: 'page-count',
      message: `${doc.pages.length} pages for a ${opts.estMinutes}-minute session (expected ${min}–${max})`,
    })
  }

  const reviewIndex = doc.pages.findIndex((p) => p.kind === 'review')
  if (reviewIndex !== doc.pages.length - 2) {
    issues.push({ check: 'review-position', message: 'review page is not second-to-last' })
  }
  const review = doc.pages[reviewIndex]
  if (review && review.kind === 'review' && review.blocks !== null) {
    issues.push({
      check: 'review-empty',
      message: 'freshly generated review page must have blocks: null (G6 fills it)',
    })
  }

  for (const page of doc.pages) {
    if (
      page.kind !== 'summary' &&
      page.kind !== 'review' &&
      !page.blocks.some(isInteractiveBlock)
    ) {
      issues.push({
        check: 'interactivity',
        message: `non-summary page "${page.id}" has no interactive block`,
      })
    }
  }

  const known = new Set(opts.goalConceptIds)
  for (const c of doc.concepts) {
    if (c.goalConceptId !== undefined && !known.has(c.goalConceptId)) {
      issues.push({
        check: 'concepts',
        message: `declared goalConceptId "${c.goalConceptId}" not on the goal`,
      })
    }
  }
  // A goal-less card (prerequisite, or a request with no goal) has nothing to cover.
  if (known.size > 0 && !doc.concepts.some((c) => c.goalConceptId !== undefined)) {
    issues.push({ check: 'concepts', message: 'activity declares no goal concept coverage at all' })
  }

  if (opts.libraryItemId && doc.libraryItemId !== opts.libraryItemId) {
    issues.push({
      check: 'library-item',
      message: `doc says ${doc.libraryItemId}, card said ${opts.libraryItemId}`,
    })
  }

  const summary = doc.pages.at(-1)
  if (summary?.kind === 'summary') {
    const words = blockWordCount(summary.blocks)
    if (words > SUMMARY_MAX_WORDS) {
      issues.push({
        check: 'summary-length',
        message: `summary recap is ${words} words (budget ${SUMMARY_MAX_WORDS})`,
      })
    }
    if (summary.blocks.some((b) => b.kind === 'heading')) {
      issues.push({
        check: 'summary-shape',
        message: 'summary recap has a heading block; the renderer already shows one',
      })
    }
    if (summary.blocks.length > 2) {
      issues.push({
        check: 'summary-shape',
        message: `summary recap has ${summary.blocks.length} blocks (expected one or two)`,
      })
    }
  }

  issues.push(...toneLintOutput(doc, `doc "${doc.title}"`))
  return issues
}
