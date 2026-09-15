import { and, eq } from 'drizzle-orm'
import type { Database, RepoContext } from '../database'
import { genCache } from '../schema'

/**
 * Local-only generation cache (docs/03): G9 suggestions and anything else
 * keyed by scope that would be wasteful to regenerate. Safe to wipe — nothing
 * here is the source of truth. (G5a's daily plan is not cached here: its
 * planned `activities` rows are the durable artifact.)
 */

export function getCached<T>(db: Database, kind: string, scopeKey: string, nowMs: number): T | undefined {
  const row = db
    .select()
    .from(genCache)
    .where(and(eq(genCache.kind, kind), eq(genCache.scopeKey, scopeKey)))
    .get()
  if (!row) return undefined
  if (row.expiresAt !== null && row.expiresAt <= nowMs) {
    db.delete(genCache).where(eq(genCache.id, row.id)).run()
    return undefined
  }
  return row.payload as T
}

/**
 * Cache read for a React render path, where reading a clock is impure: an entry
 * that carries an expiry is treated as absent rather than compared against now.
 * Kinds keyed by a content signature (G9's path signature) never set one — the
 * key going stale is what expires them.
 */
export function getCachedUnexpiring<T>(db: Database, kind: string, scopeKey: string): T | undefined {
  const row = db
    .select()
    .from(genCache)
    .where(and(eq(genCache.kind, kind), eq(genCache.scopeKey, scopeKey)))
    .get()
  return row && row.expiresAt === null ? (row.payload as T) : undefined
}

export function putCached(
  db: Database,
  ctx: RepoContext,
  input: { kind: string; scopeKey: string; payload: unknown; expiresAt?: number | null },
): void {
  invalidateCached(db, input.kind, input.scopeKey)
  db.insert(genCache)
    .values({
      id: ctx.newId(),
      kind: input.kind,
      scopeKey: input.scopeKey,
      payload: input.payload,
      createdAt: ctx.now(),
      expiresAt: input.expiresAt ?? null,
    })
    .run()
}

export function invalidateCached(db: Database, kind: string, scopeKey: string): void {
  db.delete(genCache).where(and(eq(genCache.kind, kind), eq(genCache.scopeKey, scopeKey))).run()
}
