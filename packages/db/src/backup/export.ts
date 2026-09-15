import { z } from 'zod'
import type { Database } from '../database'
import { genCache } from '../schema'
import { SCHEMA_VERSION, SYNCED_TABLE_NAMES, syncedRowSchema, syncedTable, type Row } from './rows'

/**
 * Versioned JSON export/import (docs/02 §Backup & sync, phase 1). This is the
 * safety net that ships before sync: everything the user made, in one file they
 * own. Scope = the ⟳ tables; device settings, keys, caches and `llm_calls` are
 * deliberately out (docs/03).
 */

export const EXPORT_FORMAT = 'thinkering-export'

/** Bump only for a change to the envelope itself, not for schema migrations. */
export const EXPORT_FORMAT_VERSION = 1

const envelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.number().int(),
  tables: z.record(z.string(), z.array(z.unknown())),
})

export interface ExportFile {
  format: typeof EXPORT_FORMAT
  formatVersion: number
  schemaVersion: number
  exportedAt: number
  tables: Record<string, Row[]>
}

export function exportData(db: Database, exportedAt: number): ExportFile {
  const tables: Record<string, Row[]> = {}
  for (const name of SYNCED_TABLE_NAMES) {
    // Tombstones included: a restore has to keep knowing what was deleted.
    tables[name] = db.select().from(syncedTable(name)).all() as Row[]
  }
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    tables,
  }
}

export type ImportRefusal =
  /** Not one of our files at all. */
  | 'unreadable'
  /** Written by a newer build — importing it would drop data we can't model. */
  | 'newer_format'
  | 'newer_schema'
  /** Ours, but the contents don't validate. */
  | 'invalid'

export type ParseExportResult =
  | { ok: true; file: ExportFile; rows: Record<string, Row[]> }
  | { ok: false; reason: ImportRefusal; detail?: string }

/**
 * Validates an untrusted file. A file from an older schema is accepted and
 * carried forward by the row schemas' defaults; a newer one is refused so the
 * user is told to update rather than silently losing fields (D17).
 */
export function parseExportFile(input: unknown): ParseExportResult {
  const envelope = envelopeSchema.safeParse(input)
  if (!envelope.success) return { ok: false, reason: 'unreadable' }

  const file = envelope.data
  if (file.formatVersion > EXPORT_FORMAT_VERSION) return { ok: false, reason: 'newer_format' }
  if (file.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'newer_schema' }

  const rows: Record<string, Row[]> = {}
  for (const name of SYNCED_TABLE_NAMES) {
    const raw = file.tables[name] ?? []
    const parsed = z.array(syncedRowSchema(name)).safeParse(raw)
    if (!parsed.success) {
      return { ok: false, reason: 'invalid', detail: `${name}: ${parsed.error.issues[0]?.message ?? 'invalid'}` }
    }
    rows[name] = parsed.data
  }
  return { ok: true, file: file as ExportFile, rows }
}

export interface ImportResult {
  rowCount: number
  schemaVersion: number
}

/**
 * Replaces all local learning data with the file's (confirm-replace, docs/01 §7).
 * Runs in one transaction so a bad file leaves the device untouched. `gen_cache`
 * is dropped because its entries key off ids that no longer exist.
 */
export function importData(db: Database, rows: Record<string, Row[]>): ImportResult {
  let rowCount = 0
  db.transaction((tx) => {
    for (const name of [...SYNCED_TABLE_NAMES].reverse()) {
      tx.delete(syncedTable(name)).run()
    }
    tx.delete(genCache).run()
    for (const name of SYNCED_TABLE_NAMES) {
      const tableRows = rows[name] ?? []
      if (tableRows.length === 0) continue
      // Chunked: SQLite's variable limit is per statement, not per transaction.
      for (let i = 0; i < tableRows.length; i += 200) {
        tx.insert(syncedTable(name))
          .values(tableRows.slice(i, i + 200) as never)
          .run()
      }
      rowCount += tableRows.length
    }
  })
  return { rowCount, schemaVersion: SCHEMA_VERSION }
}
