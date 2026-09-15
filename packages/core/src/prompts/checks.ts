import type { ActivityDoc } from '../schemas/activity-doc'
import { isInteractiveBlock } from '../schemas/blocks'

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
  { pattern: /you haven'?t (yet )?(learned|covered|studied|done)/i, label: 'patronizing "you haven\'t learned X" framing' },
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
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out)
}

/** Tone-lint every string in a generation output. */
export function toneLintOutput(output: unknown, where = 'output'): CheckIssue[] {
  const strings: string[] = []
  collectStrings(output, strings)
  return strings.flatMap((s) => toneLintIssues(s, where))
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
 * concepts, and tone lints.
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
    issues.push({ check: 'review-empty', message: 'freshly generated review page must have blocks: null (G6 fills it)' })
  }

  for (const page of doc.pages) {
    if (page.kind !== 'summary' && page.kind !== 'review' && !page.blocks.some(isInteractiveBlock)) {
      issues.push({ check: 'interactivity', message: `non-summary page "${page.id}" has no interactive block` })
    }
  }

  const known = new Set(opts.goalConceptIds)
  for (const c of doc.concepts) {
    if (c.goalConceptId !== undefined && !known.has(c.goalConceptId)) {
      issues.push({ check: 'concepts', message: `declared goalConceptId "${c.goalConceptId}" not on the goal` })
    }
  }
  if (!doc.concepts.some((c) => c.goalConceptId !== undefined)) {
    issues.push({ check: 'concepts', message: 'activity declares no goal concept coverage at all' })
  }

  if (opts.libraryItemId && doc.libraryItemId !== opts.libraryItemId) {
    issues.push({ check: 'library-item', message: `doc says ${doc.libraryItemId}, card said ${opts.libraryItemId}` })
  }

  issues.push(...toneLintOutput(doc, `doc "${doc.title}"`))
  return issues
}
