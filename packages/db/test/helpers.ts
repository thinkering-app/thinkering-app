import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Database, RepoContext } from '../src/database'
import * as schema from '../src/schema'

export const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
export const migrationsFolder = join(pkgRoot, 'migrations')

/** An empty database with the migration chain applied, no shortcuts. */
export function migrateFresh(): BetterSqlite3.Database {
  const sqlite = new BetterSqlite3(':memory:')
  migrate(drizzle(sqlite, { schema }), { migrationsFolder })
  return sqlite
}

let templateImage: Buffer | undefined

export function openTestDb(): { db: Database; sqlite: BetterSqlite3.Database } {
  // Applying the chain is the most expensive thing a repo test does, it happens
  // in every beforeEach, and it produces identical bytes every time — a cost
  // that grows with each migration shipped. Build it once, then restore each
  // test from the serialized image. The real empty → head path is still
  // exercised, by migrations.test.ts through migrateFresh().
  if (!templateImage) {
    const seed = migrateFresh()
    templateImage = seed.serialize()
    seed.close()
  }
  const sqlite = new BetterSqlite3(templateImage)
  const concrete = drizzle(sqlite, { schema })
  // The repo-facing Database type erases the driver's run-result type; the cast is
  // safe because repositories only use select/insert/update with run/get/all.
  return { db: concrete as unknown as Database, sqlite }
}

export function migrateToHead(sqlite: BetterSqlite3.Database): void {
  migrate(drizzle(sqlite, { schema }), { migrationsFolder })
}

/** Deterministic injected context: a controllable clock and sequential ids. */
export function testContext(startMs = 1_000_000): RepoContext & { advance: (ms: number) => void } {
  let t = startMs
  let n = 0
  return {
    now: () => t,
    newId: () => `id-${String(++n).padStart(4, '0')}`,
    advance: (ms: number) => {
      t += ms
    },
  }
}
