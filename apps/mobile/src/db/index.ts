import '../crypto-polyfill'

import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
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
    await migrateAsync(expoDb)

    const drizzleDb = drizzle(expoDb, { schema })
    db = drizzleDb as unknown as Database
  })()
  return initialization
}

/**
 * Drizzle's Expo driver is deliberately synchronous, including its migration
 * helper. On web that helper can still hit expo-sqlite's sync worker timeout
 * immediately after an asynchronous open. Apply the same journal using the
 * native async API, then hand the ready connection to Drizzle's sync repos.
 */
async function migrateAsync(expoDb: SQLiteDatabase): Promise<void> {
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `)

  const latest = await expoDb.getFirstAsync<{ created_at: number | null }>(
    'SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1',
  )
  const lastAppliedAt = latest?.created_at ?? -1

  await expoDb.withTransactionAsync(async () => {
    for (const entry of migrations.journal.entries) {
      if (entry.when <= lastAppliedAt) continue

      const sql = migrations.migrations[`m${entry.idx.toString().padStart(4, '0')}`]
      if (!sql) throw new Error(`Missing migration: ${entry.tag}`)

      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await expoDb.execAsync(statement)
      }
      await expoDb.runAsync(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        '',
        entry.when,
      )
    }
  })
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
