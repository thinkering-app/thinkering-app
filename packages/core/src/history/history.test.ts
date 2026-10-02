import { describe, expect, it } from 'vitest'
import { groupByLocalDay } from './grouping'
import { outcomeParts } from './outcome'
import { monthBoundsMs, monthGrid, monthLabel, shiftMonth, yearMonthOf } from './calendar'
import { localDateOf } from '../scheduler/local-date'

describe('outcomeParts (docs/01 §6, D1)', () => {
  it('picks the tier as the verb outside Go further', () => {
    expect(
      outcomeParts({
        section: 'next',
        tier: 'introduce',
        libraryItemId: 'worked-example',
        goalTitle: 'Explain what a token is',
      }),
    ).toEqual({ verb: { kind: 'tier', tier: 'introduce' }, subject: 'Explain what a token is' })
  })

  it('picks the library item as the verb in Go further', () => {
    expect(
      outcomeParts({
        section: 'go_further',
        tier: 'apply',
        libraryItemId: 'dig-deeper',
        goalTitle: 'Prompt clearly',
      }),
    ).toEqual({
      verb: { kind: 'libraryItem', libraryItemId: 'dig-deeper' },
      subject: 'Prompt clearly',
    })
  })

  it('falls back to the tier when the Go further item is unknown', () => {
    expect(
      outcomeParts({
        section: 'go_further',
        tier: 'apply',
        libraryItemId: 'gone-missing',
        goalTitle: null,
      }),
    ).toEqual({ verb: { kind: 'tier', tier: 'apply' }, subject: null })
  })

  it('falls back to the topic when there is no goal title', () => {
    expect(
      outcomeParts({
        section: 'strengthen',
        tier: 'strengthen',
        libraryItemId: 'retrieval-practice',
        goalTitle: null,
        topic: 'Verb conjugation',
      }),
    ).toEqual({ verb: { kind: 'tier', tier: 'strengthen' }, subject: 'Verb conjugation' })
  })

  it('reports no subject when neither the goal title nor the topic holds one', () => {
    expect(
      outcomeParts({
        section: 'strengthen',
        tier: 'strengthen',
        libraryItemId: 'retrieval-practice',
        goalTitle: '  ',
      }),
    ).toEqual({ verb: { kind: 'tier', tier: 'strengthen' }, subject: null })
  })
})

describe('groupByLocalDay', () => {
  const tz = 'Europe/Berlin'
  const at = (iso: string) => Date.parse(iso)

  it('groups newest day first, newest first within a day', () => {
    const groups = groupByLocalDay(
      [
        { id: 'a', completedAt: at('2026-09-14T08:00:00Z') },
        { id: 'c', completedAt: at('2026-09-15T18:00:00Z') },
        { id: 'b', completedAt: at('2026-09-15T07:00:00Z') },
      ],
      tz,
    )
    expect(groups.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([
      ['2026-09-15', ['c', 'b']],
      ['2026-09-14', ['a']],
    ])
  })

  it('splits on the local midnight, not the UTC one', () => {
    // 22:30Z is already the next day in Berlin (UTC+2 in September).
    const groups = groupByLocalDay(
      [
        { id: 'late', completedAt: at('2026-09-14T22:30:00Z') },
        { id: 'early', completedAt: at('2026-09-14T06:00:00Z') },
      ],
      tz,
    )
    expect(groups.map((g) => g.date)).toEqual(['2026-09-15', '2026-09-14'])
  })

  it('skips rows without a completion instant', () => {
    expect(groupByLocalDay([{ id: 'x', completedAt: null }], tz)).toEqual([])
  })
})

describe('calendar month grid', () => {
  it('fills whole weeks from Monday, marking the adjacent months', () => {
    // 2026-09-01 is a Tuesday: one leading day, 30 days, five weeks.
    const weeks = monthGrid({ year: 2026, month: 9 })
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]![0]).toEqual({ date: '2026-08-31', inMonth: false })
    expect(weeks[0]![1]).toEqual({ date: '2026-09-01', inMonth: true })
    expect(weeks.at(-1)!.at(-1)).toEqual({ date: '2026-10-04', inMonth: false })
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30)
  })

  it('handles a leap February that starts on a Monday', () => {
    // 2044-02-01 is a Monday and February has 29 days: exactly five weeks, no lead.
    const weeks = monthGrid({ year: 2044, month: 2 })
    expect(weeks[0]![0]).toEqual({ date: '2044-02-01', inMonth: true })
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(29)
  })

  it('moves across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth({ year: 2026, month: 1 }, -13)).toEqual({ year: 2024, month: 12 })
    expect(monthLabel(yearMonthOf('2026-09-15'))).toBe('September 2026')
  })

  it('bounds contain every instant whose local date is in the month', () => {
    const ym = { year: 2026, month: 9 }
    const { fromMs, toMs } = monthBoundsMs(ym)
    // The first local moment of the month in the earliest timezone, and the last in the latest.
    const firstLocal = Date.parse('2026-09-01T00:00:00+14:00')
    const lastLocal = Date.parse('2026-09-30T23:59:59-12:00')
    expect(fromMs).toBeLessThanOrEqual(firstLocal)
    expect(toMs).toBeGreaterThanOrEqual(lastLocal)
    expect(localDateOf(firstLocal, 'Pacific/Kiritimati')).toBe('2026-09-01')
    expect(localDateOf(lastLocal, 'Etc/GMT+12')).toBe('2026-09-30')
  })
})
