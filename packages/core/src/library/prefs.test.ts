import { describe, expect, it } from 'vitest'
import { activeLibraryItems, libraryPrefsForSection, type LibraryPref } from './prefs'

/** Configure-sheet activation (docs/01 §3, docs/06 situational items). */

const fresh = { startedGoalCount: 0 }
const underway = { startedGoalCount: 4 }

function activeIds(
  section: 'next' | 'strengthen' | 'go_further',
  prefs: LibraryPref[] = [],
  situation = underway,
) {
  return activeLibraryItems(section, prefs, situation).map((i) => i.id)
}

describe('library prefs', () => {
  it('locks mixed-review and connect-ideas until two goals are under way, then turns them on', () => {
    const one = { startedGoalCount: 1 }
    const two = { startedGoalCount: 2 }
    expect(activeIds('strengthen', [], one)).not.toContain('mixed-review')
    expect(activeIds('go_further', [], one)).not.toContain('connect-ideas')
    expect(activeIds('strengthen', [], two)).toContain('mixed-review')
    expect(activeIds('go_further', [], two)).toContain('connect-ideas')
  })

  it('keeps a locked item off even when a stored preference turned it on', () => {
    const on = [{ section: 'strengthen' as const, libraryItemId: 'mixed-review', active: true }]
    const rows = libraryPrefsForSection('strengthen', on, fresh)
    expect(rows.find((r) => r.item.id === 'mixed-review')).toMatchObject({
      active: false,
      locked: true,
    })
    expect(activeIds('strengthen', on, underway)).toContain('mixed-review')
  })

  it('offers big-picture-map while the path is at its first goal', () => {
    expect(activeIds('next', [], fresh)).toContain('big-picture-map')
    expect(activeIds('next')).not.toContain('big-picture-map')
  })

  it('lets a stored preference override the situational default either way', () => {
    const off = [{ section: 'next' as const, libraryItemId: 'big-picture-map', active: false }]
    expect(activeLibraryItems('next', off, fresh).map((i) => i.id)).not.toContain('big-picture-map')
    const offAfter = [
      { section: 'strengthen' as const, libraryItemId: 'mixed-review', active: false },
    ]
    expect(activeLibraryItems('strengthen', offAfter, underway).map((i) => i.id)).not.toContain(
      'mixed-review',
    )
  })

  it('never hands the model an empty active set', () => {
    const allOff = libraryPrefsForSection('next', [], underway).map((r) => ({
      section: 'next' as const,
      libraryItemId: r.item.id,
      active: false,
    }))
    expect(activeLibraryItems('next', allOff, underway)).toHaveLength(1)
  })

  it('lists every item offered in a section, active or not', () => {
    const rows = libraryPrefsForSection('go_further', [], underway)
    expect(rows.every((r) => r.item.sections.includes('go_further'))).toBe(true)
    expect(rows.length).toBeGreaterThan(0)
  })
})
