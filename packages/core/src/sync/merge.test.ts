import { describe, expect, it } from 'vitest'
import { mergePull, pickWinner, selectPush, type SyncRowMeta } from './merge'

const row = (id: string, updatedAt: number, deletedAt: number | null = null): SyncRowMeta => ({
  id,
  updatedAt,
  deletedAt,
})

describe('pickWinner', () => {
  it('takes a row the device has never seen', () => {
    expect(pickWinner(undefined, row('a', 1))).toBe('remote')
  })

  it('takes whichever side was written later', () => {
    expect(pickWinner(row('a', 10), row('a', 20))).toBe('remote')
    expect(pickWinner(row('a', 20), row('a', 10))).toBe('local')
  })

  it('lets a tombstone win a tie, so a delete is not undone', () => {
    expect(pickWinner(row('a', 10), row('a', 10, 10))).toBe('remote')
    expect(pickWinner(row('a', 10, 10), row('a', 10))).toBe('local')
  })

  it('keeps local on an exact draw, so a repeat pull writes nothing', () => {
    expect(pickWinner(row('a', 10), row('a', 10))).toBe('local')
    expect(pickWinner(row('a', 10, 5), row('a', 10, 7))).toBe('local')
  })

  it('a later edit beats an earlier delete, and vice versa', () => {
    expect(pickWinner(row('a', 10, 10), row('a', 20))).toBe('remote')
    expect(pickWinner(row('a', 20), row('a', 10, 10))).toBe('local')
  })

  it('a device with a fast clock wins — LWW on client timestamps, by design', () => {
    const skewed = row('a', Date.parse('2030-01-01T00:00:00Z'))
    expect(pickWinner(row('a', Date.parse('2026-09-15T00:00:00Z')), skewed)).toBe('remote')
  })
})

describe('mergePull', () => {
  it('applies only the remote winners and advances the cursor past everything seen', () => {
    const local = new Map([
      ['a', row('a', 30)],
      ['b', row('b', 5)],
    ])
    const { apply, cursor } = mergePull(local, [row('a', 20), row('b', 25), row('c', 12)], 4)

    expect(apply.map((r) => r.id)).toEqual(['b', 'c'])
    // 'a' lost, but the cursor still moves past it — re-pulling it would lose again.
    expect(cursor).toBe(25)
  })

  it('never moves the cursor backwards on an empty pull', () => {
    expect(mergePull(new Map(), [], 99).cursor).toBe(99)
  })
})

describe('selectPush', () => {
  it('sends what changed since the last push and stops the cursor at the newest row sent', () => {
    const { push, cursor } = selectPush([row('a', 5), row('b', 10), row('c', 30)], 8)
    expect(push.map((r) => r.id)).toEqual(['b', 'c'])
    expect(cursor).toBe(30)
  })

  it('leaves the cursor alone when nothing changed', () => {
    expect(selectPush([row('a', 5)], 8)).toEqual({ push: [], cursor: 8 })
  })
})
