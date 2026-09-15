import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import type { CoreContext } from '@thinkering/core'
import * as schema from './schema'

/**
 * The database handle repositories work against: any synchronous sqlite drizzle
 * driver — expo-sqlite in the app, better-sqlite3 in node tests and scripts.
 */
export type Database = BaseSQLiteDatabase<'sync', unknown, typeof schema>

/** Repositories take the injected clock/id context (docs/10 determinism rule). */
export type RepoContext = CoreContext
