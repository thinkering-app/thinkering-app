import '../crypto-polyfill'

import { drizzle } from 'drizzle-orm/expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { openDatabaseAsync } from 'expo-sqlite'
import { useEffect, useState } from 'react'
import type { Database, RepoContext } from '@thinkering/db'
import { schema, uuidv7 } from '@thinkering/db'
import migrations from '@thinkering/db/migrations'

/**
 * Assigned before the root renders its routes. Imports are live bindings, so
 * repositories keep their synchronous API once the asynchronous database open
 * has completed. Opening asynchronously matters on web: expo-sqlite must first
 * start its worker and compile wasm, which can outlive its synchronous timeout.
 */
export let db: Database

let initialization: Promise<void> | undefined

function initializeDatabase(): Promise<void> {
  initialization ??= (async () => {
    const expoDb = await openDatabaseAsync('thinkering.db', { enableChangeListener: true })
    await expoDb.execAsync('PRAGMA foreign_keys = ON')

    const drizzleDb = drizzle(expoDb, { schema })
    await migrate(drizzleDb, migrations)
    db = drizzleDb as unknown as Database
  })()
  return initialization
}

/** Injected clock/id context for repository writes (docs/10 determinism rule). */
export const repoContext: RepoContext = {
  now: () => Date.now(),
  newId: () => uuidv7(),
}

/** Opens the database and applies bundled migrations; routes wait for `success`. */
export function useDbMigrations(): { success: boolean; error?: Error } {
  const [state, setState] = useState<{ success: boolean; error?: Error }>({ success: false })

  useEffect(() => {
    let active = true
    void initializeDatabase().then(
      () => {
        if (active) setState({ success: true })
      },
      (error: unknown) => {
        if (!active) return
        setState({
          success: false,
          error:
            error instanceof Error ? error : new Error('Unknown database initialization error'),
        })
      },
    )
    return () => {
      active = false
    }
  }, [])

  return state
}
