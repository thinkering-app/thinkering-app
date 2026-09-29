import { pageToPlainText } from '../activity/describe'
import { resourceMediaOf, youtubeVideoId } from '../activity/resources'
import type { ActivityDoc } from '../schemas/activity-doc'
import { isInteractiveBlock, type Block } from '../schemas/blocks'
import type { ResourcesSearchOutput } from '../schemas/generations'

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
 * Where the two short pages at the end of an activity (docs/05) stop being
 * short and start being a lesson. A bloated page is structurally valid, so
 * length is the only thing that catches the drift.
 *
 * Both sit above what the prompts ask for — 45 words for the review page, 50
 * for the summary recap — on purpose. A paragraph that ran to 47 is fine; the
 * regression worth a failed check is the slide back to a few hundred.
 */
export const REVIEW_MAX_WORDS = 65
export const REVIEW_WORDS_ASKED = 45
export const SUMMARY_MAX_WORDS = 70
export const SUMMARY_WORDS_ASKED = 50
/** A freeText's "consider": asked for under 25; well past it, it's the answer. */
export const CONSIDER_MAX_WORDS = 40
export const CONSIDER_WORDS_ASKED = 25

/** What the recap may be made of: one paragraph, or a bullet per idea (docs/05). */
const SUMMARY_BLOCK_KINDS: readonly string[] = ['paragraph', 'list']

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
      message: `${where}: ${words} words (prompt asks ${REVIEW_WORDS_ASKED}, flagged over ${REVIEW_MAX_WORDS})`,
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
 * concepts, every freeText's "consider", the summary recap's word budget, and
 * tone lints.
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

  // G5b is asked for a consider on every freeText; the schema leaves it
  // optional for G7 pages and older documents, so a skipped one only shows here.
  for (const page of doc.pages) {
    for (const block of page.blocks ?? []) {
      if (block.kind !== 'freeText') continue
      const words = block.consider?.split(/\s+/).filter(Boolean).length ?? 0
      if (words === 0) {
        issues.push({
          check: 'consider',
          message: `freeText "${block.id}" on page "${page.id}" has no consider`,
        })
      } else if (words > CONSIDER_MAX_WORDS) {
        issues.push({
          check: 'consider',
          message: `freeText "${block.id}" consider is ${words} words (prompt asks ${CONSIDER_WORDS_ASKED}, flagged over ${CONSIDER_MAX_WORDS})`,
        })
      }
    }
  }

  const summary = doc.pages.at(-1)
  if (summary?.kind === 'summary') {
    const words = blockWordCount(summary.blocks)
    if (words > SUMMARY_MAX_WORDS) {
      issues.push({
        check: 'summary-length',
        message: `summary recap is ${words} words (prompt asks ${SUMMARY_WORDS_ASKED}, flagged over ${SUMMARY_MAX_WORDS})`,
      })
    }
    // Prose or a bullet list, and nothing else: the renderer already puts a
    // heading above the recap, and the last page before the rating row is not
    // a place to ask them something.
    const wrong = summary.blocks
      .filter((b) => !SUMMARY_BLOCK_KINDS.includes(b.kind))
      .map((b) => b.kind)
    if (wrong.length > 0) {
      issues.push({
        check: 'summary-shape',
        message: `summary recap: paragraphs or a list only, got ${wrong.join(', ')}`,
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

/**
 * What a resource search was asked for, which differs by kind and which the
 * shared output schema deliberately stays loose around: the schema guards what
 * the app stores, this guards what the prompt was meant to produce.
 */
export interface ResourceExpectations {
  goalTitles: readonly string[]
  count: { min: number; max: number }
  /**
   * G4 seeds one video and one article: watch-along wants a video,
   * guided-reading wants an article, and pickResource silently falls back to
   * whatever is saved when the media it wants is absent.
   */
  mediaSplit?: boolean
  /** Saved URLs the search was told not to return. */
  excludeUrls?: readonly string[]
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * A page the learner opens, rather than a place to browse from. Only the two
 * shapes we can judge without guessing: a YouTube URL that isn't one video
 * (a channel, playlist or search), and a bare homepage. `groundBlocks` already
 * refuses to play either inside an activity, so a saved one is dead weight.
 */
function hubReason(url: string): string | undefined {
  const host = hostOf(url)
  if (host === undefined) return undefined
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host) && !youtubeVideoId(url)) {
    return 'a YouTube channel, playlist or search, not one video'
  }
  try {
    const { pathname, search } = new URL(url)
    if (pathname.replace(/\/+$/, '') === '' && search === '') return 'a site homepage'
  } catch {
    return undefined
  }
  return undefined
}

/**
 * Structural checks for a resource search (G4, G12) beyond what the schema
 * enforces: the count and variety the prompt asks for, the media split early
 * activities depend on, goal titles that will survive the client's exact-title
 * matching, and pages specific enough to build on.
 */
export function checkResources(
  output: ResourcesSearchOutput,
  expected: ResourceExpectations,
): CheckIssue[] {
  const issues: CheckIssue[] = []
  const { resources } = output
  const { min, max } = expected.count

  if (resources.length < min || resources.length > max) {
    issues.push({
      check: 'count',
      message: `${resources.length} resources (expected ${min === max ? min : `${min}–${max}`})`,
    })
  }

  if (expected.mediaSplit) {
    const media = resources.map((r) => resourceMediaOf(r.url))
    if (!media.includes('video') || !media.includes('article')) {
      issues.push({
        check: 'media-split',
        message: `needs one video and one article; got ${media.join(' + ') || 'nothing'}`,
      })
    }
  }

  const excluded = new Set((expected.excludeUrls ?? []).map((u) => u.toLowerCase()))
  const seen = new Map<string, string>()
  for (const resource of resources) {
    const host = hostOf(resource.url)
    if (host !== undefined) {
      const first = seen.get(host)
      if (first !== undefined) {
        issues.push({
          check: 'variety',
          message: `two from ${host}: "${first}" and "${resource.title}"`,
        })
      } else {
        seen.set(host, resource.title)
      }
    }

    if (excluded.has(resource.url.toLowerCase())) {
      issues.push({
        check: 'duplicate',
        message: `"${resource.title}" is already saved: ${resource.url}`,
      })
    }

    const hub = hubReason(resource.url)
    if (hub)
      issues.push({ check: 'specific', message: `"${resource.title}" is ${hub}: ${resource.url}` })

    for (const title of resource.goalTitles) {
      if (!expected.goalTitles.includes(title)) {
        issues.push({
          check: 'goal-titles',
          message: `"${resource.title}" names a goal that isn't on the path, so it will be dropped: "${title}"`,
        })
      }
    }
  }

  issues.push(...toneLintOutput(output, 'resources'))
  return issues
}
