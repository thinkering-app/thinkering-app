import { describe, expect, it } from 'vitest'
import { completedTodayBySection } from './completion'

/**
 * Section completion (docs/01 §3). The interesting part is the day boundary:
 * "today" is the device's local day (D12), keyed on completion time.
 */

const BERLIN = 'Europe/Berlin'
// 2026-03-10 00:30 Berlin = 2026-03-09 23:30 UTC — the same instant is a
// different calendar day either side of midnight.
const justAfterLocalMidnight = Date.UTC(2026, 2, 9, 23, 30)
const justBeforeLocalMidnight = Date.UTC(2026, 2, 9, 22, 30)

describe('completedTodayBySection', () => {
  it('counts completions per section, ignoring unfinished activities', () => {
    const counts = completedTodayBySection(
      [
        { section: 'next', completedAt: justAfterLocalMidnight },
        { section: 'strengthen', completedAt: justAfterLocalMidnight },
        { section: 'strengthen', completedAt: justAfterLocalMidnight },
        { section: 'go_further', completedAt: null },
      ],
      { today: '2026-03-10', timeZone: BERLIN },
    )
    expect(counts).toEqual({ next: 1, strengthen: 2, go_further: 0 })
  })

  it('excludes a completion that fell on the previous local day', () => {
    const counts = completedTodayBySection([{ section: 'next', completedAt: justBeforeLocalMidnight }], {
      today: '2026-03-10',
      timeZone: BERLIN,
    })
    expect(counts.next).toBe(0)
  })
})
