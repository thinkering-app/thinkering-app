import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { settings } from '../schema'

/** Local key/value settings (docs/03). Values are JSON. */

export function getSetting<T>(db: Database, key: string): T | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get()
  return row ? (row.value as T) : undefined
}

export function setSetting(db: Database, key: string, value: unknown): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run()
}
