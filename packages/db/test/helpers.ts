import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Database, RepoContext } from '../src/database'
import * as schema from '../src/schema'

export const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
export const migrationsFolder = join(pkgRoot, 'migrations')

export function openTestDb(): { db: Database; sqlite: BetterSqlite3.Database } {
  const sqlite = new BetterSqlite3(':memory:')
  const concrete = drizzle(sqlite, { schema })
  migrate(concrete, { migrationsFolder })
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
