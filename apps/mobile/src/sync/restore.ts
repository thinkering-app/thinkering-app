import { listInterests, setBackupEnabled } from '@thinkering/db'

import { db } from '@/db'
import { syncNow } from './engine'

export type AccountRestore = { ok: true; hasInterests: boolean } | { ok: false; message: string }

/**
 * Signing in on a fresh install (docs/01 §1): turn the backup on and wait for
 * the first pull, so the caller knows whether there is learning to go back to.
 * The backup stays on after a failure, and the next sync picks it up.
 */
export async function restoreFromAccount(): Promise<AccountRestore> {
  setBackupEnabled(db, true)
  const outcome = await syncNow()
  if (outcome.ok) return { ok: true, hasInterests: listInterests(db).length > 0 }
  if (outcome.reason === 'newer_schema') {
    return {
      ok: false,
      message:
        'Your backup came from a newer version of thinkering. Update the app, then try again.',
    }
  }
  return {
    ok: false,
    message: "We couldn't reach your backup. Check your connection and try again.",
  }
}
