import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { migrateFresh, migrateToHead, migrationsFolder, openTestDb, pkgRoot } from './helpers'

const migrationFiles = readdirSync(migrationsFolder)
  .filter((f) => f.endsWith('.sql'))
  .sort()

describe('migration chain', () => {
  it('empty → head applies cleanly and creates every schema table', () => {
    // migrateFresh, not openTestDb: this test is the one that has to actually
    // run the chain rather than restore the image built from it.
    const sqlite = migrateFresh()
    const tables = new Set(
      (
        sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
          name: string
        }[]
      ).map((r) => r.name),
    )
    for (const expected of [
      'interests',
      'topics',
      'goals',
      'activities',
      'responses',
      'resources',
      'contexts',
      'reflections',
      'library_prefs',
      'routine_notes',
      'gen_cache',
      'llm_calls',
      'analytics_buffer',
      'settings',
    ]) {
      expect(tables, expected).toContain(expected)
    }
  })

  it('is idempotent — migrating an already-migrated db is a no-op', () => {
    const { sqlite } = openTestDb()
    expect(() => migrateToHead(sqlite)).not.toThrow()
  })

  it('every committed snapshot (fixtures/db/v<N>.sql) migrates forward to head with rows intact', () => {
    const snapshotDir = join(pkgRoot, 'fixtures/db')
    const snapshots = readdirSync(snapshotDir).filter((f) => /^v\d+\.sql$/.test(f))
    // The convention requires a snapshot per shipped migration.
    expect(snapshots.length).toBe(migrationFiles.length)

    for (const file of snapshots) {
      const sqlite = new BetterSqlite3(':memory:')
      sqlite.exec(readFileSync(join(snapshotDir, file), 'utf8'))

      const countRows = (table: string) =>
        (sqlite.prepare(`SELECT count(*) AS n FROM "${table}"`).get() as { n: number }).n
      const tables = (
        sqlite
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_\\_%' ESCAPE '\\'",
          )
          .all() as { name: string }[]
      ).map((r) => r.name)
      const before = Object.fromEntries(tables.map((t) => [t, countRows(t)]))
      expect(
        Object.values(before).some((n) => n > 0),
        `${file} must contain sample rows`,
      ).toBe(true)

      migrateToHead(sqlite)

      for (const table of tables) {
        expect(countRows(table), `${file} → head lost rows in ${table}`).toBeGreaterThanOrEqual(
          before[table]!,
        )
      }
      // Spot-check content survived, not just counts.
      const interest = sqlite.prepare("SELECT name FROM interests WHERE id = 'i-sample'").get() as
        { name: string } | undefined
      expect(interest?.name).toBe('Understanding LLMs')
    }
  })
})

describe('additive-first check (D17)', () => {
  // Destructive statements must be explicitly allowlisted here with a comment
  // explaining the deprecation window / copy-migrate-swap plan (docs/10 Tier 2).
  const allowlist: { file: string; pattern: RegExp; reason: string }[] = []

  const destructive = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bALTER\s+TABLE\b[^;]*\bRENAME\b/i,
  ]

  it('no migration drops, renames, or retypes outside the allowlist', () => {
    for (const file of migrationFiles) {
      const sql = readFileSync(join(migrationsFolder, file), 'utf8')
      const statements = sql.split('--> statement-breakpoint')
      for (const statement of statements) {
        for (const pattern of destructive) {
          if (!pattern.test(statement)) continue
          const allowed = allowlist.some((a) => a.file === file && a.pattern.test(statement))
          expect(
            allowed,
            `${file}: destructive statement needs an allowlist entry:\n${statement.trim()}`,
          ).toBe(true)
        }
      }
    }
  })
})
