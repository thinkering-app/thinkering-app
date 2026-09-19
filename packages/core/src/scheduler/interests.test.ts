import { describe, expect, it } from 'vitest'
import { suggestInterests } from './interests'

describe('suggestInterests', () => {
  it('suggests two, never-practiced first, then least recently practiced', () => {
    expect(
      suggestInterests([
        { id: 'recent', lastPracticed: '2026-09-17', sortOrder: 1 },
        { id: 'stale', lastPracticed: '2026-09-02', sortOrder: 2 },
        { id: 'fresh', lastPracticed: null, sortOrder: 3 },
      ]),
    ).toEqual(['fresh', 'stale'])
  })

  it('breaks ties by selector order', () => {
    expect(
      suggestInterests([
        { id: 'b', lastPracticed: null, sortOrder: 2 },
        { id: 'a', lastPracticed: null, sortOrder: 1 },
        { id: 'c', lastPracticed: null, sortOrder: 3 },
      ]),
    ).toEqual(['a', 'b'])
  })
})
