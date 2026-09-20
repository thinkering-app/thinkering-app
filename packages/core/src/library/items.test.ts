import { describe, expect, it } from 'vitest'
import { INTERACTIVE_BLOCK_KINDS } from '../schemas/blocks'
import { LIBRARY_ITEMS, libraryItemsForSection } from './items'

/** Library invariants (docs/10 Tier 1): valid skeleton, outcome labels, unique ids. */
describe('library definitions', () => {
  it('ids are unique and kebab-case', () => {
    const ids = LIBRARY_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('every item has a non-empty page skeleton and valid interactive block kinds', () => {
    for (const item of LIBRARY_ITEMS) {
      expect(item.pageSkeleton.length, item.id).toBeGreaterThanOrEqual(2)
      expect(item.interactions.length, item.id).toBeGreaterThan(0)
      for (const kind of item.interactions) {
        expect(INTERACTIVE_BLOCK_KINDS, `${item.id} interaction ${kind}`).toContain(kind)
      }
      expect(item.sections.length, item.id).toBeGreaterThan(0)
    }
  })

  it('go_further items carry flavor and outcomeLabel; others do not (D1)', () => {
    for (const item of LIBRARY_ITEMS) {
      if (item.sections.includes('go_further')) {
        expect(item.flavor, item.id).toBeDefined()
        expect(item.outcomeLabel, item.id).toBeTruthy()
        if (item.flavor === 'apply') expect(item.outcomeLabel).toBe('Put to use')
      } else {
        expect(item.flavor, item.id).toBeUndefined()
        expect(item.outcomeLabel, item.id).toBeUndefined()
      }
    }
  })

  it('every section has at least one default-active item', () => {
    for (const section of ['next', 'strengthen', 'go_further'] as const) {
      expect(
        libraryItemsForSection(section).some((i) => i.defaultActive),
        section,
      ).toBe(true)
    }
  })
})
