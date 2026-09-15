import { describe, expect, it } from 'vitest'
import { conceptCoverage } from './coverage'
import { respreadSortOrders, sortOrderBetween } from './ordering'
import { pathSignature } from './signature'

describe('sortOrderBetween', () => {
  it('places a goal at either end and between neighbours', () => {
    expect(sortOrderBetween(null, null)).toBe(1)
    expect(sortOrderBetween(null, 3)).toBe(2)
    expect(sortOrderBetween(3, null)).toBe(4)
    expect(sortOrderBetween(1, 2)).toBe(1.5)
  })

  it('reports a collapsed gap instead of returning a duplicate order', () => {
    let before = 1
    const after = 2
    // Repeatedly moving into the same slot exhausts double precision.
    for (let i = 0; i < 60; i++) {
      const mid = sortOrderBetween(before, after)
      if (mid === null) {
        expect(respreadSortOrders(3)).toEqual([1, 2, 3])
        return
      }
      before = mid
    }
    throw new Error('expected the midpoint to collapse')
  })
})

describe('conceptCoverage', () => {
  it('unions the goal concept ids completed activities declared', () => {
    const coverage = conceptCoverage([
      {
        goalId: 'g1',
        doc: { concepts: [{ goalConceptId: 'c1', label: 'One' }, { label: 'Extra' }] },
      },
      { goalId: 'g1', doc: { concepts: [{ goalConceptId: 'c2', label: 'Two' }] } },
      { goalId: 'g2', doc: null },
      { goalId: null, doc: { concepts: [{ goalConceptId: 'c9', label: 'Prereq card' }] } },
    ])
    expect([...(coverage.get('g1') ?? [])]).toEqual(['c1', 'c2'])
    expect(coverage.has('g2')).toBe(false)
  })
})

describe('pathSignature', () => {
  it('changes when a goal is added or renamed, not when the path is reordered', () => {
    const path = [
      { id: 'a', title: 'First' },
      { id: 'b', title: 'Second' },
    ]
    expect(pathSignature([path[1]!, path[0]!])).toBe(pathSignature(path))
    expect(pathSignature([...path, { id: 'c', title: 'Third' }])).not.toBe(pathSignature(path))
    expect(pathSignature([{ id: 'a', title: 'Renamed' }, path[1]!])).not.toBe(pathSignature(path))
  })
})
