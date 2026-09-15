import type { Database } from '../database'
import { getSetting, setSetting } from './settings'

/**
 * Backup switch and sync cursors (docs/03 §settings). Kept in the local
 * key/value table rather than a table of its own — it is two numbers and a
 * boolean, and none of it is synced.
 */

const BACKUP_KEY = 'backup_enabled'
const CURSORS_KEY = 'sync_state'

export interface SyncCursors {
  /** Newest remote `updated_at` already merged in. */
  lastPullAt: number
  /** Newest local `updated_at` already sent up. */
  lastPushAt: number
  /** When the last successful round-trip finished; null until one has. */
  lastSyncedAt: number | null
}

export const NO_CURSORS: SyncCursors = { lastPullAt: 0, lastPushAt: 0, lastSyncedAt: null }

export function isBackupEnabled(db: Database): boolean {
  return getSetting<boolean>(db, BACKUP_KEY) ?? false
}

export function setBackupEnabled(db: Database, enabled: boolean): void {
  setSetting(db, BACKUP_KEY, enabled)
}

export function getSyncCursors(db: Database): SyncCursors {
  return { ...NO_CURSORS, ...(getSetting<Partial<SyncCursors>>(db, CURSORS_KEY) ?? {}) }
}

export function setSyncCursors(db: Database, cursors: SyncCursors): void {
  setSetting(db, CURSORS_KEY, cursors)
}

/**
 * Forgets what has been exchanged, so the next sync reconciles everything from
 * scratch. Used after an import (the local data is now someone else's history)
 * and after signing out (the next account is unrelated).
 */
export function resetSyncCursors(db: Database): void {
  setSetting(db, CURSORS_KEY, NO_CURSORS)
}
