import { describe, expect, it } from 'vitest'
import { isSameLocalDay, localDateOf } from './local-date'

describe('localDateOf', () => {
  it('computes the calendar date in the device timezone, not UTC', () => {
    // 2026-06-10 03:00 UTC
    const ms = Date.UTC(2026, 5, 10, 3, 0)
    expect(localDateOf(ms, 'UTC')).toBe('2026-06-10')
    expect(localDateOf(ms, 'America/Los_Angeles')).toBe('2026-06-09') // 20:00 previous day
    expect(localDateOf(ms, 'Asia/Tokyo')).toBe('2026-06-10') // 12:00 same day
  })

  it('spring-forward DST: the skipped hour does not split the day', () => {
    // US DST starts 2026-03-08 02:00 local (America/New_York, UTC-5 → UTC-4).
    const beforeJump = Date.UTC(2026, 2, 8, 6, 30) // 01:30 EST
    const afterJump = Date.UTC(2026, 2, 8, 7, 30) // 03:30 EDT
    expect(localDateOf(beforeJump, 'America/New_York')).toBe('2026-03-08')
    expect(localDateOf(afterJump, 'America/New_York')).toBe('2026-03-08')
    expect(isSameLocalDay(beforeJump, afterJump, 'America/New_York')).toBe(true)
  })

  it('fall-back DST: the repeated hour stays on one day and the 25-hour day still ends at midnight', () => {
    // US DST ends 2026-11-01 02:00 local (America/New_York, UTC-4 → UTC-5).
    const firstOneThirty = Date.UTC(2026, 10, 1, 5, 30) // 01:30 EDT
    const secondOneThirty = Date.UTC(2026, 10, 1, 6, 30) // 01:30 EST (repeated)
    const lateThatDay = Date.UTC(2026, 11 - 1, 2, 4, 59) // 23:59 EST Nov 1
    const nextMidnight = Date.UTC(2026, 10, 2, 5, 0) // 00:00 EST Nov 2
    expect(localDateOf(firstOneThirty, 'America/New_York')).toBe('2026-11-01')
    expect(localDateOf(secondOneThirty, 'America/New_York')).toBe('2026-11-01')
    expect(localDateOf(lateThatDay, 'America/New_York')).toBe('2026-11-01')
    expect(localDateOf(nextMidnight, 'America/New_York')).toBe('2026-11-02')
  })

  it('local dates compare chronologically as strings', () => {
    expect('2026-09-30' < '2026-10-01').toBe(true)
  })
})
