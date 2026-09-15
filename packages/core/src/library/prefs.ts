import type { Section } from '../domain'
import { LIBRARY_ITEMS } from './items'
import type { LibraryItem } from './types'

/**
 * Which library items are active for an interest's section (docs/01 §3
 * Configure, docs/06). A stored preference always wins; without one the item's
 * `defaultActive` decides, with the two situational items from docs/06 handled
 * here: `mixed-review` unlocks once ≥3 goals are introduced, and
 * `big-picture-map` is on while the path is still at its first goal.
 */

export interface LibraryPref {
  section: Section
  libraryItemId: string
  active: boolean
}

export interface LibrarySituation {
  /** Goals at `introduced` or beyond. */
  startedGoalCount: number
}

const MIXED_REVIEW_UNLOCK = 3

function defaultActiveIn(item: LibraryItem, situation: LibrarySituation): boolean {
  if (item.id === 'mixed-review') return situation.startedGoalCount >= MIXED_REVIEW_UNLOCK
  if (item.id === 'big-picture-map') return situation.startedGoalCount === 0
  return item.defaultActive
}

/** Every item offered in a section, in display order, with its resolved activation. */
export function libraryPrefsForSection(
  section: Section,
  prefs: readonly LibraryPref[],
  situation: LibrarySituation,
): { item: LibraryItem; active: boolean }[] {
  return LIBRARY_ITEMS.filter((item) => item.sections.includes(section)).map((item) => {
    const pref = prefs.find((p) => p.section === section && p.libraryItemId === item.id)
    return { item, active: pref ? pref.active : defaultActiveIn(item, situation) }
  })
}

/**
 * The active set G5a chooses from. Never empty: if every item in a section has
 * been turned off (shouldn't happen — the sheet keeps one checked), fall back
 * to the section's first item rather than sending the model an empty list.
 */
export function activeLibraryItems(
  section: Section,
  prefs: readonly LibraryPref[],
  situation: LibrarySituation,
): LibraryItem[] {
  const resolved = libraryPrefsForSection(section, prefs, situation)
  const active = resolved.filter((r) => r.active).map((r) => r.item)
  return active.length > 0 ? active : resolved.slice(0, 1).map((r) => r.item)
}
