/**
 * Row-level last-write-wins, the whole of the sync conflict protocol (docs/02
 * §Backup & sync). Pure so conflicts are unit-testable without a server: the
 * transport hands it metadata, it says which side to keep.
 */

export interface SyncRowMeta {
  id: string
  /** Epoch ms, set by whichever device wrote the row. */
  updatedAt: number
  /** Tombstone — soft-deleted rows sync like any other row. */
  deletedAt: number | null
}

export type MergeWinner = 'local' | 'remote'

/**
 * Newer `updated_at` wins. Exactly equal timestamps are a real case (two writes
 * inside the same millisecond, or the same row pushed twice), so they need a
 * rule rather than a coin toss: a tombstone beats a live edit — undeleting
 * something the user deleted is the worse surprise — and otherwise local stands,
 * which keeps a no-op pull from rewriting rows.
 *
 * A device whose clock runs fast wins conflicts it arguably shouldn't. That is
 * inherent to LWW on client timestamps and accepted for single-user data (D-sync);
 * nothing here silently rewrites a timestamp to compensate, because that would
 * make the ordering non-deterministic across devices.
 */
export function pickWinner(local: SyncRowMeta | undefined, remote: SyncRowMeta): MergeWinner {
  if (!local) return 'remote'
  if (remote.updatedAt > local.updatedAt) return 'remote'
  if (remote.updatedAt < local.updatedAt) return 'local'
  if (remote.deletedAt !== null && local.deletedAt === null) return 'remote'
  return 'local'
}

export interface PullMerge<T extends SyncRowMeta> {
  /** The remote rows that won and should be written locally. */
  apply: T[]
  /** How far the pull cursor may advance — the newest `updated_at` seen. */
  cursor: number
}

export function mergePull<T extends SyncRowMeta>(
  local: ReadonlyMap<string, SyncRowMeta>,
  remote: readonly T[],
  sinceCursor = 0,
): PullMerge<T> {
  const apply: T[] = []
  let cursor = sinceCursor
  for (const row of remote) {
    if (row.updatedAt > cursor) cursor = row.updatedAt
    if (pickWinner(local.get(row.id), row) === 'remote') apply.push(row)
  }
  return { apply, cursor }
}

/**
 * What to push: everything written since the last push. The cursor is the newest
 * `updated_at` actually sent, not the wall clock, so a row written while the
 * request was in flight is caught by the next run instead of being skipped.
 */
export function selectPush<T extends SyncRowMeta>(
  rows: readonly T[],
  sinceCursor: number,
): { push: T[]; cursor: number } {
  const push: T[] = []
  let cursor = sinceCursor
  for (const row of rows) {
    if (row.updatedAt <= sinceCursor) continue
    push.push(row)
    if (row.updatedAt > cursor) cursor = row.updatedAt
  }
  return { push, cursor }
}
