import { describe, expect, it } from 'vitest'
import { listGoals, listHistory, listInterests, listPlannedForDate, setSetting } from '../src'
import { clearAllData, seedFixtureData } from '../src/seed'
import { openTestDb, testContext } from './helpers'

describe('seedFixtureData', () => {
  it('creates the fixture interest with the documented statuses, history, and today cards', () => {
    const { db } = openTestDb()
    const ctx = testContext(1_757_926_800_000) // 2026-09-15 ~09:00 UTC
    expect(seedFixtureData(db, ctx, { today: '2026-09-15' })).toBe(true)

    const interest = listInterests(db)[0]!
    expect(interest.name).toBe('Understanding LLMs')

    const goals = listGoals(db, interest.id)
    expect(goals.map((g) => g.status)).toEqual([
      'applied',
      'strengthened',
      'introduced',
      'not_started',
      'not_started',
      'not_started',
    ])

    const history = listHistory(db, { interestId: interest.id })
    expect(history).toHaveLength(6)
    expect(history.every((a) => a.doc !== null)).toBe(true)

    const today = listPlannedForDate(db, interest.id, '2026-09-15')
    expect(today.map((a) => a.section).sort()).toEqual(['go_further', 'next', 'strengthen'])
    expect(today.every((a) => a.status === 'ready' && a.doc !== null)).toBe(true)
  })

  it('is idempotent', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    seedFixtureData(db, ctx, { today: '2026-09-15' })
    expect(seedFixtureData(db, ctx, { today: '2026-09-15' })).toBe(false)
    expect(listInterests(db)).toHaveLength(1)
  })

  it('clearAllData empties every table, including ones added after it was written', () => {
    const { db, sqlite } = openTestDb()
    seedFixtureData(db, testContext(), { today: '2026-09-15' })
    setSetting(db, 'backup_enabled', true)

    clearAllData(db)

    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
      )
      .all() as { name: string }[]
    const nonEmpty = tables.filter(
      ({ name }) => (sqlite.prepare(`SELECT count(*) AS n FROM "${name}"`).get() as { n: number }).n > 0,
    )
    expect(nonEmpty.map((t) => t.name)).toEqual([])
  })
})
