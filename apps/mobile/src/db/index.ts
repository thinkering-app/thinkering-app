import { drizzle } from 'drizzle-orm/expo-sqlite'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { openDatabaseSync } from 'expo-sqlite'
import type { Database, RepoContext } from '@thinkering/db'
import { schema, uuidv7 } from '@thinkering/db'
import migrations from '@thinkering/db/migrations'

const expoDb = openDatabaseSync('thinkering.db', { enableChangeListener: true })
expoDb.execSync('PRAGMA foreign_keys = ON')

const drizzleDb = drizzle(expoDb, { schema })

/** The app-wide database handle; repositories from @thinkering/db work against it. */
export const db: Database = drizzleDb as unknown as Database

/** Injected clock/id context for repository writes (docs/10 determinism rule). */
export const repoContext: RepoContext = {
  now: () => Date.now(),
  newId: () => uuidv7(),
}

/** Applies bundled migrations on app start; render nothing until `success`. */
export function useDbMigrations(): { success: boolean; error?: Error } {
  const { success, error } = useMigrations(drizzleDb, migrations)
  return { success, error: error ?? undefined }
}
