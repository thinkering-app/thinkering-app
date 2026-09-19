import type { LocalDate } from './local-date'

/**
 * Explore → All (docs/01 §3): which exploring interests Today suggests from.
 * Not all of them — a handful of "when I can" interests would otherwise each
 * plan a full set of cards. Least recently practiced first, so the suggestions
 * rotate as the learner works through them; judged on days before today, so
 * the pair holds steady for the whole day rather than shifting after each
 * finished card.
 */

export interface SuggestionCandidate {
  id: string
  /** Local date of the last activity finished before today; null if none yet. */
  lastPracticed: LocalDate | null
  /** Selector order, as the tiebreak. */
  sortOrder: number
}

export const SUGGESTED_INTERESTS = 2

export function suggestInterests(
  candidates: readonly SuggestionCandidate[],
  limit: number = SUGGESTED_INTERESTS,
): string[] {
  return [...candidates]
    .sort((a, b) => {
      if (a.lastPracticed !== b.lastPracticed) {
        if (a.lastPracticed === null) return -1
        if (b.lastPracticed === null) return 1
        return a.lastPracticed < b.lastPracticed ? -1 : 1
      }
      return a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    })
    .slice(0, limit)
    .map((c) => c.id)
}
