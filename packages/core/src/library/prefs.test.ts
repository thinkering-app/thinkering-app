import { describe, expect, it } from 'vitest'
import { activeLibraryItems, libraryPrefsForSection } from './prefs'

/** Configure-sheet activation (docs/01 §3, docs/06 situational items). */

const fresh = { startedGoalCount: 0 }
const underway = { startedGoalCount: 4 }

function activeIds(
  section: 'next' | 'strengthen' | 'go_further',
  prefs = [],
  situation = underway,
) {
  return activeLibraryItems(section, prefs, situation).map((i) => i.id)
}

describe('library prefs', () => {
  it('unlocks mixed-review only once three goals are under way', () => {
    expect(activeIds('strengthen', [], fresh)).not.toContain('mixed-review')
    expect(activeIds('strengthen')).toContain('mixed-review')
  })

  it('offers big-picture-map while the path is at its first goal', () => {
    expect(activeIds('next', [], fresh)).toContain('big-picture-map')
    expect(activeIds('next')).not.toContain('big-picture-map')
  })

  it('lets a stored preference override the situational default either way', () => {
    const off = [{ section: 'next' as const, libraryItemId: 'big-picture-map', active: false }]
    expect(activeLibraryItems('next', off, fresh).map((i) => i.id)).not.toContain('big-picture-map')
    const on = [{ section: 'strengthen' as const, libraryItemId: 'mixed-review', active: true }]
    expect(activeLibraryItems('strengthen', on, fresh).map((i) => i.id)).toContain('mixed-review')
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
