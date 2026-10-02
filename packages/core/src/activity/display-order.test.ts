import { describe, expect, it } from 'vitest'
import { displayOrder } from './display-order'

describe('displayOrder', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']

  it('lays the same block out the same way every time, and differently from another', () => {
    expect(displayOrder(ids, 'page:block', ids)).toEqual(displayOrder(ids, 'page:block', ids))
    const layouts = new Set(
      ['s1', 's2', 's3', 's4', 's5'].map((s) => displayOrder(ids, s, ids).join()),
    )
    expect(layouts.size).toBeGreaterThan(1)
  })

  it('never shows a block already solved', () => {
    for (let i = 0; i < 200; i++) {
      const pair = ['x', 'y']
      expect(displayOrder(pair, `seed-${i}`, pair)).toEqual(['y', 'x'])
      const out = displayOrder(ids, `seed-${i}`, ids)
      expect(out).not.toEqual(ids)
      expect([...out].sort()).toEqual(ids)
    }
  })
})
