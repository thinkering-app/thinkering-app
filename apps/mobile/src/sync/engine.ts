import {
  applyPull,
  collectPush,
  getSyncCursors,
  isBackupEnabled,
  resetSyncCursors,
  setSyncCursors,
  type SyncPayload,
} from '@thinkering/db'

import { db } from '@/db'
import { signOut } from './account'
import { backupConfigured, supabase } from './supabase'

/**
 * Push/pull against `sync_rows` (docs/02 §Backup & sync). Pull first, then push:
 * a row the pull overwrote is pushed straight back unchanged, which is a no-op,
 * whereas pushing first could send a row the device is about to discard.
 */

const TABLE = 'sync_rows'
/** PostgREST caps a response; the pull pages until it runs out. */
const PAGE = 500
const PUSH_BATCH = 200

export type SyncOutcome =
  | { ok: true; pushed: number; pulled: number; at: number }
  | { ok: false; reason: 'off' | 'signed_out' | 'newer_schema' | 'failed'; message?: string }

let inFlight: Promise<SyncOutcome> | null = null

/** Runs one round-trip; concurrent callers share the one in flight. */
export function syncNow(): Promise<SyncOutcome> {
  inFlight ??= runSync().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function runSync(): Promise<SyncOutcome> {
  if (!backupConfigured) return { ok: false, reason: 'off' }

  try {
    // Keep every database read inside the error boundary. In particular, the
    // first web sync can overlap initial route reads while expo-sqlite's worker
    // is still settling; optional backup work must never take down the app.
    if (!isBackupEnabled(db)) return { ok: false, reason: 'off' }

    const client = supabase()
    const { data: sessionData } = await client.auth.getSession()
    const userId = sessionData.session?.user.id
    if (!userId) return { ok: false, reason: 'signed_out' }

    const cursors = getSyncCursors(db)
    const remote: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client
        .from(TABLE)
        .select('table_name, id, updated_at, deleted_at, schema_version, data')
        .gt('updated_at', cursors.lastPullAt)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw new Error(error.message)
      remote.push(...data.map(toPayload))
      if (data.length < PAGE) break
    }

    // Collected before applying rather than page by page: a batch can carry a
    // child ahead of its parent, and the whole delta lands in one transaction.
    const pull = applyPull(db, remote, cursors.lastPullAt)
    if (!pull.ok) return { ok: false, reason: 'newer_schema' }

    const { push, cursor: pushCursor } = collectPush(db, cursors.lastPushAt)
    for (let i = 0; i < push.length; i += PUSH_BATCH) {
      const rows = push.slice(i, i + PUSH_BATCH).map((payload) => toRow(userId, payload))
      const { error } = await client.from(TABLE).upsert(rows, { onConflict: 'user_id,table_name,id' })
      if (error) throw new Error(error.message)
    }

    const at = Date.now()
    setSyncCursors(db, { lastPullAt: pull.cursor, lastPushAt: pushCursor, lastSyncedAt: at })
    return { ok: true, pushed: push.length, pulled: pull.applied, at }
  } catch (error) {
    return { ok: false, reason: 'failed', message: error instanceof Error ? error.message : undefined }
  }
}

/**
 * Turning backup off deletes the server copy (docs/02) — a confirmed destructive
 * action the screen asks about first. Local data is untouched.
 */
export async function deleteRemoteData(): Promise<boolean> {
  if (!backupConfigured) return true
  const client = supabase()
  const { data } = await client.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return false

  const { error } = await client.from(TABLE).delete().eq('user_id', userId)
  if (error) return false
  resetSyncCursors(db)
  return true
}

interface RemoteRow {
  table_name: string
  id: string
  updated_at: number | string
  deleted_at: number | string | null
  schema_version: number
  data: unknown
}

function toPayload(row: RemoteRow): unknown {
  return {
    table: row.table_name,
    id: row.id,
    // Postgres bigints can arrive as strings depending on the driver; epoch ms
    // is well inside the safe-integer range either way.
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
    schemaVersion: row.schema_version,
    data: row.data,
  }
}

function toRow(userId: string, payload: SyncPayload): Record<string, unknown> {
  return {
    user_id: userId,
    table_name: payload.table,
    id: payload.id,
    updated_at: payload.updatedAt,
    deleted_at: payload.deletedAt,
    schema_version: payload.schemaVersion,
    data: payload.data,
  }
}

/**
 * Signing out forgets the cursors as well as the session: the next account is a
 * different history, and a stale cursor would make the device think it had
 * already exchanged rows it has never seen.
 */
export async function signOutAndForget(): Promise<void> {
  await signOut()
  resetSyncCursors(db)
}
