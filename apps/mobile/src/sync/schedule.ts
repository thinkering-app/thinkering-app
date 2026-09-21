import { useEffect } from 'react'
import { AppState } from 'react-native'
import { addDatabaseChangeListener } from 'expo-sqlite'
import { SYNCED_TABLE_NAMES } from '@thinkering/db'

import { pauseSync, resumeSync, syncNow, syncSettled } from './engine'
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
 * Runs `task` with sync held still: nothing scheduled starts, and whatever was
 * already in flight has finished first. Deleting the learner's data has to be
 * the only thing touching either copy while it runs — otherwise a pull already
 * on its way can put the learning back, or a push can refill the server copy
 * that was just emptied, and the delete reports success either way. The second
 * cancel is for the timer the deleting writes themselves queued through the
 * change hook.
 */
export async function withSyncPaused<T>(task: () => Promise<T>): Promise<T> {
  pauseSync()
  cancelScheduledSync()
  try {
    await syncSettled()
    return await task()
  } finally {
    cancelScheduledSync()
    resumeSync()
  }
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
