import type { Section } from '../domain'
import { LIBRARY_ITEMS } from './items'
import type { LibraryItem } from './types'

/**
 * Which library items are active for an interest's section (docs/01 §3
 * Configure, docs/06). Two items need more than one goal to work with —
 * `mixed-review` and `connect-ideas` — so they're locked off until two goals
 * are started, whatever a stored preference says, and on by default after.
 * Otherwise a stored preference wins; without one the item's `defaultActive`
 * decides, except `big-picture-map`, which is on while the path is still at
 * its first goal.
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

/** Started goals each locked item waits for. */
const UNLOCK_AT_STARTED_GOALS: Partial<Record<string, number>> = {
  'mixed-review': 2,
  'connect-ideas': 2,
}

/** Off, with its switch disabled, until the path gives it something to work with. */
export function isLibraryItemLocked(item: LibraryItem, situation: LibrarySituation): boolean {
  const unlockAt = UNLOCK_AT_STARTED_GOALS[item.id]
  return unlockAt !== undefined && situation.startedGoalCount < unlockAt
}

function defaultActiveIn(item: LibraryItem, situation: LibrarySituation): boolean {
  if (UNLOCK_AT_STARTED_GOALS[item.id] !== undefined) return true
  if (item.id === 'big-picture-map') return situation.startedGoalCount === 0
  return item.defaultActive
}

/** Every item offered in a section, in display order, with its resolved activation. */
export function libraryPrefsForSection(
  section: Section,
  prefs: readonly LibraryPref[],
  situation: LibrarySituation,
): { item: LibraryItem; active: boolean; locked: boolean }[] {
  return LIBRARY_ITEMS.filter((item) => item.sections.includes(section)).map((item) => {
    if (isLibraryItemLocked(item, situation)) return { item, active: false, locked: true }
    const pref = prefs.find((p) => p.section === section && p.libraryItemId === item.id)
    return { item, active: pref ? pref.active : defaultActiveIn(item, situation), locked: false }
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
