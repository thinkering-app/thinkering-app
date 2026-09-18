import '../crypto-polyfill'

import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import type { Database, RepoContext } from '@thinkering/db'
import { schema, uuidv7 } from '@thinkering/db'
import migrations from '@thinkering/db/migrations'

/**
 * Assigned before the root renders its routes. Imports are live bindings, so
 * repositories keep their synchronous API once the asynchronous database open
 * has completed. Opening asynchronously matters on web: expo-sqlite must first
 * start its worker and compile wasm, which can outlive its synchronous timeout.
 *
 * The web build also runs without a rollback journal file. A synchronous query
 * blocks the page's main thread while the SQLite worker answers, and WebKit
 * won't service the worker's OPFS file work while that is happening — so the
 * first synchronous write, which is the one that has to open a journal file,
 * never returns and takes the screen down with it. Keeping the journal in
 * memory leaves a write touching only the database file's already-open access
 * handle. The cost is the usual one: a tab killed mid-transaction can leave the
 * file inconsistent, which is why backup matters more on web than on device.
 */
export let db: Database

let initialization: Promise<void> | undefined
let opened = false

async function openAndMigrate(): Promise<void> {
  let expoDb: SQLiteDatabase | undefined
  let stage = 'opening the database'
  try {
    expoDb = await openDatabaseAsync('thinkering.db', { enableChangeListener: true })
    stage = 'configuring foreign keys'
    await expoDb.execAsync('PRAGMA foreign_keys = ON')
    if (Platform.OS === 'web') {
      stage = 'configuring the web journal'
      await expoDb.execAsync('PRAGMA journal_mode = MEMORY')
    }
    stage = 'applying migrations'
    await migrateAsync(expoDb)

    stage = 'binding Drizzle'
    const drizzleDb = drizzle(expoDb, { schema })
    db = drizzleDb as unknown as Database
    opened = true
  } catch (error) {
    // Keep the user-facing message deliberately plain, but leave enough
    // evidence in browser/device logs to distinguish storage, worker and
    // migration failures without reproducing them under a debugger.
    console.error(`[database] Initialization failed while ${stage}.`, error)
    if (expoDb) {
      try {
        await expoDb.closeAsync()
      } catch (closeError) {
        console.error('[database] Failed to close after initialization failed.', closeError)
      }
    }
    throw error
  }
}

function initializeDatabase(): Promise<void> {
  initialization ??= openAndMigrate().catch((error: unknown) => {
    // Forget the failed attempt so native can retry in process. Web replaces
    // the failed worker by reloading before it reaches this module again.
    initialization = undefined
    throw error
  })
  return initialization
}

/**
 * Why the database could not be opened. The web build keeps its SQLite file in
 * OPFS, which one browsing context holds exclusively and private browsing does
 * not provide at all — two states the person can act on, so they get their own
 * copy rather than the catch-all.
 */
export type DbUnavailableReason = 'another-tab' | 'no-storage' | 'unknown'

function reasonFor(error: unknown): DbUnavailableReason {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  // Refusing an access handle someone else holds: Chromium raises
  // NoModificationAllowedError, WebKit a bare InvalidStateError.
  if (text.includes('NoModificationAllowedError') || text.includes('InvalidStateError'))
    return 'another-tab'
  // No OPFS at all — private browsing, or any other context without storage.
  if (text.includes('navigator.storage') || text.includes('UnknownError')) return 'no-storage'
  return 'unknown'
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

type DbMigrationState = {
  success: boolean
  failure?: DbUnavailableReason
  retry: () => void
}

/** Opens the database and applies bundled migrations; routes wait for `success`. */
export function useDbMigrations(): DbMigrationState {
  const [state, setState] = useState<{ success: boolean; failure?: DbUnavailableReason }>({
    success: false,
  })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    // A failed web open can leave expo-sqlite's worker holding a partially
    // acquired OPFS pool. Only replacing that worker can recover, so retrying
    // means reloading the page there. Native failures can retry in process.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload()
      return
    }
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true
    void initializeDatabase().then(
      () => {
        if (active) setState({ success: true })
      },
      (error: unknown) => {
        if (active) setState({ success: false, failure: reasonFor(error) })
      },
    )

    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    // The other tab may be closed while this one sits on the error screen, and
    // coming back here is the moment to replace the failed worker and try again.
    if (state.failure !== 'another-tab') return
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active' && !opened) retry()
    })
    return () => subscription.remove()
  }, [retry, state.failure])

  return { ...state, retry }
}
