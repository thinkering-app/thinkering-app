import { gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { mergePull, selectPush, type SyncRowMeta } from '@thinkering/core'
import type { Database } from '../database'
import {
  SCHEMA_VERSION,
  SYNCED_TABLE_NAMES,
  syncColumns,
  syncedRowSchema,
  syncedTable,
  type Row,
  type SyncedTableName,
} from './rows'

/**
 * The device half of Supabase sync (docs/02 §Backup & sync, phase 2). Rows
 * travel as `{table, id, updatedAt, deletedAt, schemaVersion, data}` — the server
 * mirror is one JSON table, so a local migration never needs a server migration
 * (D17). Conflict resolution is `@thinkering/core`'s LWW; this is the SQLite
 * side of it, and the transport lives in the app.
 */

const payloadSchema = z.object({
  table: z.string(),
  id: z.string(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
  schemaVersion: z.number().int().positive(),
  data: z.record(z.string(), z.unknown()),
})

export interface SyncPayload {
  table: SyncedTableName
  id: string
  updatedAt: number
  deletedAt: number | null
  schemaVersion: number
  data: Row
}

/** Every synced row written since `sinceCursor`. */
export function collectPush(
  db: Database,
  sinceCursor: number,
): { push: SyncPayload[]; cursor: number } {
  const push: SyncPayload[] = []
  let cursor = sinceCursor

  for (const table of SYNCED_TABLE_NAMES) {
    const t = syncedTable(table)
    // Narrowed in SQL so a sync doesn't deserialize every ActivityDoc on the
    // device; `selectPush` stays the one place that decides what is due.
    const changed = db
      .select()
      .from(t)
      .where(gt(syncColumns(t).updatedAt, sinceCursor))
      .all() as Row[]
    const selected = selectPush(changed as unknown as SyncRowMeta[], sinceCursor)
    if (selected.cursor > cursor) cursor = selected.cursor

    for (const row of selected.push as unknown as Row[]) {
      push.push({
        table,
        id: row.id as string,
        updatedAt: row.updatedAt as number,
        deletedAt: (row.deletedAt as number | null) ?? null,
        schemaVersion: SCHEMA_VERSION,
        data: row,
      })
    }
  }
  return { push, cursor }
}

export type ApplyPullResult =
  | { ok: true; applied: number; skipped: number; cursor: number }
  /** Something up there was written by a newer build; stop rather than drop fields (D17). */
  | { ok: false; reason: 'newer_schema' }

/**
 * Writes the remote rows that win LWW. One transaction, foreign keys deferred:
 * a pull can legitimately carry a child ahead of its parent within the batch,
 * and the batch is consistent by the time it commits.
 */
export function applyPull(db: Database, payloads: unknown[], sinceCursor: number): ApplyPullResult {
  const byTable = new Map<SyncedTableName, SyncPayload[]>()
  let skipped = 0
  let cursor = sinceCursor

  for (const raw of payloads) {
    const parsed = payloadSchema.safeParse(raw)
    if (!parsed.success) {
      skipped += 1
      continue
    }
    const payload = parsed.data
    if (payload.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'newer_schema' }

    const table = payload.table as SyncedTableName
    if (!SYNCED_TABLE_NAMES.includes(table)) {
      // A table this build doesn't have. Skipping keeps sync working instead of
      // wedging it, and the row stays untouched server-side for a newer build.
      skipped += 1
      continue
    }
    const row = syncedRowSchema(table).safeParse(payload.data)
    if (!row.success) {
      skipped += 1
      continue
    }
    const list = byTable.get(table) ?? []
    list.push({ ...payload, table, data: row.data })
    byTable.set(table, list)
  }

  let applied = 0
  db.transaction((tx) => {
    tx.run(sql`PRAGMA defer_foreign_keys = ON`)
    for (const table of SYNCED_TABLE_NAMES) {
      const incoming = byTable.get(table)
      if (!incoming?.length) continue

      const t = syncedTable(table)
      const { id, updatedAt, deletedAt } = syncColumns(t)
      // Metadata only: LWW needs three columns, and the rest of an activities
      // row is an ActivityDoc we would deserialize for nothing.
      const local = new Map<string, SyncRowMeta>(
        tx
          .select({ id, updatedAt, deletedAt })
          .from(t)
          .all()
          .map((row) => [
            row.id as string,
            {
              id: row.id as string,
              updatedAt: row.updatedAt as number,
              deletedAt: (row.deletedAt as number | null) ?? null,
            },
          ]),
      )
      const merged = mergePull(local, incoming, cursor)
      cursor = merged.cursor

      for (const winner of merged.apply) {
        tx.insert(t)
          .values(winner.data as never)
          .onConflictDoUpdate({ target: id, set: winner.data as never })
          .run()
        applied += 1
      }
    }
  })

  return { ok: true, applied, skipped, cursor }
}
