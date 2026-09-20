/**
 * `pnpm seed` — builds .data/seed.db with the fixture interest for inspection
 * with any sqlite browser. The app seeds itself through the same
 * seedFixtureData() via the dev-only button on the Me tab.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { localDateOf } from '@thinkering/core'
import type { Database as RepoDatabase } from '../src/database'
import * as schema from '../src/schema'
import { seedFixtureData } from '../src/seed'
import { uuidv7 } from '../src/uuid'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.data/seed.db')
mkdirSync(dirname(out), { recursive: true })
rmSync(out, { force: true })

const sqlite = new Database(out)
const db = drizzle(sqlite, { schema })
migrate(db, { migrationsFolder: join(root, 'migrations') })

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
seedFixtureData(
  db as unknown as RepoDatabase,
  { now: () => Date.now(), newId: uuidv7 },
  {
    today: localDateOf(Date.now(), timeZone),
  },
)
console.log(`seeded ${out}`)
