import { useEffect } from 'react'
import { AppState } from 'react-native'
import { addDatabaseChangeListener } from 'expo-sqlite'
import { SYNCED_TABLE_NAMES } from '@thinkering/db'

import { syncNow } from './engine'
import { backupConfigured, supabase } from './supabase'

/**
 * When sync runs (docs/02): on foreground, and debounced after significant
 * writes. "Significant" is read off SQLite's own change hook rather than sprinkled
 * through the repositories — the ⟳ tables are exactly the writes that matter, and
 * the app already opens the database with the hook enabled.
 */

const DEBOUNCE_MS = 8000

let timer: ReturnType<typeof setTimeout> | null = null

export function scheduleSync(delayMs: number = DEBOUNCE_MS): void {
  if (!backupConfigured) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void syncNow()
  }, delayMs)
}

export function cancelScheduledSync(): void {
  if (timer) clearTimeout(timer)
  timer = null
}

/**
 * Installed once, at the root. Does nothing in a build with no Supabase project
 * — and nothing until migrations have run: on a fresh install the settings
 * table doesn't exist yet, and this effect fires before the first render that
 * waits for it.
 */
export function useSyncLifecycle(ready: boolean): void {
  useEffect(() => {
    if (!ready || !backupConfigured) return

    const synced = new Set<string>(SYNCED_TABLE_NAMES)
    const auth = supabase().auth
    const changes = addDatabaseChangeListener((event) => {
      if (synced.has(event.tableName)) scheduleSync()
    })
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void auth.startAutoRefresh()
        scheduleSync(0)
      } else {
        void auth.stopAutoRefresh()
      }
    })

    if (AppState.currentState === 'active') void auth.startAutoRefresh()
    scheduleSync(0)

    return () => {
      changes.remove()
      appState.remove()
      cancelScheduledSync()
      void auth.stopAutoRefresh()
    }
  }, [ready])
}
