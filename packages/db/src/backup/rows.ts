import { getTableColumns, getTableName, type Column, type Table } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import journal from '../../migrations/meta/_journal.json'
import { SYNCED_TABLES } from '../schema'

/**
 * The device's schema version = the number of applied migrations (docs/02 §D17).
 * Export files and pushed sync rows carry it; readers refuse anything newer than
 * the build they're running.
 */
export const SCHEMA_VERSION: number = journal.entries.length

/** Synced tables in FK-safe insertion order (parents first); reverse to delete. */
export const SYNCED_TABLE_NAMES = Object.keys(SYNCED_TABLES) as SyncedTableName[]

export type SyncedTableName = keyof typeof SYNCED_TABLES

export function syncedTable(name: SyncedTableName): SQLiteTable {
  return SYNCED_TABLES[name] as unknown as SQLiteTable
}

export type Row = Record<string, unknown>

/** The columns every ⟳ table carries, as drizzle columns for query building. */
export function syncColumns(table: SQLiteTable): {
  id: SQLiteColumn
  updatedAt: SQLiteColumn
  deletedAt: SQLiteColumn
} {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>
  const { id, updatedAt, deletedAt } = columns
  if (!id || !updatedAt || !deletedAt)
    throw new Error(`${getTableName(table)} is not a synced table`)
  return { id, updatedAt, deletedAt }
}

/**
 * A row validator derived from the drizzle table itself, so adding a column
 * never leaves a hand-written copy behind. Columns that are nullable or have a
 * default are optional, which is exactly what reading an *older* export needs:
 * fields added since are simply absent and fall back to their default (D17,
 * "migrate it forward through the same migration chain").
 */
export function tableRowSchema(table: Table): z.ZodType<Row> {
  const columns = getTableColumns(table) as Record<string, Column>
  const shape: Record<string, z.ZodType> = {}
  const requiredJson: string[] = []

  for (const [key, column] of Object.entries(columns)) {
    const optional = !column.notNull || column.hasDefault
    let schema: z.ZodType
    switch (column.dataType) {
      case 'string':
        schema = z.string()
        break
      case 'number':
        schema = z.number()
        break
      case 'boolean':
        schema = z.boolean()
        break
      case 'json':
        // Payload shape is the writing boundary's job (ActivityDoc, response
        // payloads); here we only care that the value is present when required.
        schema = z.unknown()
        if (!optional) requiredJson.push(key)
        break
      default:
        throw new Error(`${getTableName(table)}.${key}: unsupported column type ${column.dataType}`)
    }
    if (!column.notNull) schema = schema.nullable()
    shape[key] = optional ? schema.optional() : schema
  }

  return z.object(shape).superRefine((row: Row, ctx) => {
    for (const key of requiredJson) {
      if (row[key] === undefined || row[key] === null) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'required' })
      }
    }
  }) as z.ZodType<Row>
}

const cache = new Map<SyncedTableName, z.ZodType<Row>>()

export function syncedRowSchema(name: SyncedTableName): z.ZodType<Row> {
  let schema = cache.get(name)
  if (!schema) {
    schema = tableRowSchema(syncedTable(name))
    cache.set(name, schema)
  }
  return schema
}
