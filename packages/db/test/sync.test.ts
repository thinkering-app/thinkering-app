import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  applyPull,
  collectPush,
  getSyncCursors,
  importData,
  exportData,
  parseExportFile,
  setSyncCursors,
} from '../src'
import type { Database } from '../src/database'
import { goals, interests } from '../src/schema'
import { openTestDb } from './helpers'
import { seedSampleRows } from './sample-rows'

/** The SQLite side of LWW sync (docs/10 Tier 2). The resolver itself is core's. */

function seeded(): Database {
  const { db } = openTestDb()
  seedSampleRows(db)
  return db
}

const payload = (table: string, data: Record<string, unknown>) => ({
  table,
  id: data.id as string,
  updatedAt: data.updatedAt as number,
  deletedAt: (data.deletedAt as number | null) ?? null,
  schemaVersion: SCHEMA_VERSION,
  data,
})

describe('collectPush', () => {
  it('sends everything on a first sync and nothing on the next one', () => {
    const db = seeded()
    const first = collectPush(db, 0)
    expect(first.push.length).toBeGreaterThan(0)
    expect(first.push.every((p) => p.schemaVersion === SCHEMA_VERSION)).toBe(true)

    expect(collectPush(db, first.cursor).push).toEqual([])
  })

  it('sends only what changed since the cursor, tombstones included', () => {
    const db = seeded()
    const { cursor } = collectPush(db, 0)

    db.update(interests)
      .set({ name: 'Renamed', updatedAt: cursor + 10 })
      .run()
    db.update(goals)
      .set({ deletedAt: cursor + 20, updatedAt: cursor + 20 })
      .run()

    const next = collectPush(db, cursor)
    expect(next.push.map((p) => p.table).sort()).toEqual(['goals', 'interests'])
    expect(next.push.find((p) => p.table === 'goals')?.deletedAt).toBe(cursor + 20)
    expect(next.cursor).toBe(cursor + 20)
  })
})

describe('applyPull', () => {
  it('writes remote rows the device has never seen, parents and children together', () => {
    const source = seeded()
    const { push } = collectPush(source, 0)

    const { db, sqlite } = openTestDb()
    sqlite.pragma('foreign_keys = ON')
    const result = applyPull(db, push, 0)

    expect(result).toMatchObject({ ok: true, skipped: 0 })
    if (!result.ok) return
    expect(result.applied).toBe(push.length)
    expect(sqlite.prepare("SELECT name FROM interests WHERE id = 'i-sample'").get()).toEqual({
      name: 'Understanding LLMs',
    })
  })

  it('keeps the newer side of a concurrent edit, in both directions', () => {
    const db = seeded()
    const local = db.select().from(interests).get()!

    const older = applyPull(
      db,
      [payload('interests', { ...local, name: 'Stale', updatedAt: local.updatedAt - 1 })],
      0,
    )
    expect(older).toMatchObject({ ok: true, applied: 0 })
    expect(db.select().from(interests).get()?.name).toBe('Understanding LLMs')

    const newer = applyPull(
      db,
      [payload('interests', { ...local, name: 'Fresher', updatedAt: local.updatedAt + 1 })],
      0,
    )
    expect(newer).toMatchObject({ ok: true, applied: 1 })
    expect(db.select().from(interests).get()?.name).toBe('Fresher')
  })

  it('applies a remote tombstone rather than resurrecting the row', () => {
    const db = seeded()
    const local = db.select().from(goals).get()!
    const at = local.updatedAt + 5

    applyPull(db, [payload('goals', { ...local, deletedAt: at, updatedAt: at })], 0)
    expect(db.select().from(goals).get()?.deletedAt).toBe(at)
  })

  it('refuses the whole batch when a row comes from a newer schema', () => {
    const db = seeded()
    const local = db.select().from(interests).get()!
    const result = applyPull(
      db,
      [
        {
          ...payload('interests', { ...local, name: 'From the future' }),
          schemaVersion: SCHEMA_VERSION + 1,
        },
      ],
      0,
    )
    expect(result).toEqual({ ok: false, reason: 'newer_schema' })
    expect(db.select().from(interests).get()?.name).toBe('Understanding LLMs')
  })

  it('skips rows it cannot make sense of instead of wedging the sync', () => {
    const db = seeded()
    const local = db.select().from(interests).get()!
    const result = applyPull(
      db,
      [
        { nonsense: true },
        payload('some_future_table', { id: 'x', updatedAt: 9, deletedAt: null }),
        payload('interests', { id: 'i-broken', updatedAt: 9, deletedAt: null }),
        payload('interests', { ...local, name: 'Fine', updatedAt: local.updatedAt + 1 }),
      ],
      0,
    )
    expect(result).toMatchObject({ ok: true, applied: 1, skipped: 3 })
    expect(db.select().from(interests).get()?.name).toBe('Fine')
  })

  it('advances the cursor past rows that lost, so they are not re-pulled forever', () => {
    const db = seeded()
    const local = db.select().from(interests).get()!
    const result = applyPull(
      db,
      [payload('interests', { ...local, updatedAt: local.updatedAt - 100 })],
      0,
    )
    expect(result).toMatchObject({ ok: true, applied: 0, cursor: local.updatedAt - 100 })
  })
})

describe('cursors', () => {
  it('start at zero, persist, and reset when a backup is imported', () => {
    const db = seeded()
    expect(getSyncCursors(db)).toEqual({ lastPullAt: 0, lastPushAt: 0, lastSyncedAt: null })

    setSyncCursors(db, { lastPullAt: 10, lastPushAt: 20, lastSyncedAt: 30 })
    expect(getSyncCursors(db).lastPushAt).toBe(20)

    const parsed = parseExportFile(JSON.parse(JSON.stringify(exportData(db, 1))))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    importData(db, parsed.rows)
    expect(getSyncCursors(db)).toEqual({ lastPullAt: 0, lastPushAt: 0, lastSyncedAt: null })
  })
})
