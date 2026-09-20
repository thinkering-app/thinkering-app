import { describe, expect, it } from 'vitest'
import {
  EXPORT_FORMAT_VERSION,
  SCHEMA_VERSION,
  SYNCED_TABLE_NAMES,
  exportData,
  importData,
  parseExportFile,
} from '../src'
import { genCache, interests } from '../src/schema'
import { openTestDb } from './helpers'
import { seedSampleRows } from './sample-rows'

/** Export/import round-trip and version refusals (docs/10 Tier 2). */

function exportedJson() {
  const { db } = openTestDb()
  seedSampleRows(db)
  // Survives the JSON hop the share sheet / file picker puts it through.
  return JSON.parse(JSON.stringify(exportData(db, 1_757_900_000_000))) as unknown
}

describe('export/import round-trip', () => {
  it('export → wipe → import restores every synced table deep-equal', () => {
    const before = exportedJson()
    const parsed = parseExportFile(before)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const { db } = openTestDb()
    db.insert(genCache)
      .values({ id: 'c1', kind: 'daily_plan', scopeKey: 'x', payload: {}, createdAt: 1 })
      .run()
    importData(db, parsed.rows)

    const after = JSON.parse(JSON.stringify(exportData(db, 1_757_900_000_000)))
    expect(after).toEqual(before)
    // Caches key off ids the imported file may not have; they go.
    expect(db.select().from(genCache).all()).toHaveLength(0)
  })

  it('replaces rather than merges — anything already local is gone', () => {
    const parsed = parseExportFile(exportedJson())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const { db, sqlite } = openTestDb()
    db.insert(interests)
      .values({
        id: 'i-local',
        name: 'Local only',
        wantToLearn: 'x',
        whyChoice: 'fun',
        experienceChoice: 'explored',
        frequency: 'daily',
        sessionMinutes: 5,
        status: 'focus',
        sortOrder: 2,
        createdAt: 1,
        updatedAt: 1,
      })
      .run()

    importData(db, parsed.rows)
    const ids = (sqlite.prepare('SELECT id FROM interests').all() as { id: string }[]).map(
      (r) => r.id,
    )
    expect(ids).toEqual(['i-sample'])
  })
})

describe('version handling', () => {
  it('refuses a file from a newer schema', () => {
    const file = exportedJson() as Record<string, unknown>
    const result = parseExportFile({ ...file, schemaVersion: SCHEMA_VERSION + 1 })
    expect(result).toEqual({ ok: false, reason: 'newer_schema' })
  })

  it('refuses a file from a newer envelope format', () => {
    const file = exportedJson() as Record<string, unknown>
    const result = parseExportFile({ ...file, formatVersion: EXPORT_FORMAT_VERSION + 1 })
    expect(result).toEqual({ ok: false, reason: 'newer_format' })
  })

  it('migrates an older file forward — columns added since are simply absent', () => {
    const file = exportedJson() as {
      schemaVersion: number
      tables: Record<string, Record<string, unknown>[]>
    }
    // A v1 export predates activities.topic (migration 0001).
    const older = {
      ...file,
      schemaVersion: 1,
      tables: {
        ...file.tables,
        activities: file.tables.activities!.map(({ topic: _topic, ...rest }) => rest),
      },
    }

    const parsed = parseExportFile(older)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const { db, sqlite } = openTestDb()
    importData(db, parsed.rows)
    const row = sqlite
      .prepare("SELECT topic, title FROM activities WHERE id = 'a-sample'")
      .get() as {
      topic: string | null
      title: string
    }
    expect(row.topic).toBeNull()
    expect(row.title).toBe('Tokens, not words')
  })

  it('rejects a file that is not ours, and one whose rows are malformed', () => {
    expect(parseExportFile({ hello: 'world' })).toEqual({ ok: false, reason: 'unreadable' })

    const file = exportedJson() as { tables: Record<string, unknown[]> }
    const broken = { ...file, tables: { ...file.tables, interests: [{ id: 'x' }] } }
    const result = parseExportFile(broken)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid')
  })
})

describe('coverage of the synced set', () => {
  it('exports a row for every ⟳ table the sample data fills', () => {
    const file = exportedJson() as { tables: Record<string, unknown[]> }
    for (const name of SYNCED_TABLE_NAMES) {
      expect(file.tables[name]?.length, name).toBeGreaterThan(0)
    }
  })
})
