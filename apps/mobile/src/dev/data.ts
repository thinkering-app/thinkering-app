import { clearAllData, seedFixtureData } from '@thinkering/db'
import type { LocalDate } from '@thinkering/core'

import { db, repoContext } from '@/db'

/**
 * Dev-only data resets (docs/10 Tier 6), behind `DEV_TOOLS`. Clearing only
 * touches SQLite: the device token, a BYO key and a backup sign-in stay in
 * SecureStore, and backup is switched off by the settings going with it. The
 * learner's own "Delete all data" is `@/me/delete-all` — it takes the server
 * copy with it.
 */
export function resetLocalData(opts: { seed: boolean; today: LocalDate }): void {
  clearAllData(db)
  if (opts.seed) seedFixtureData(db, repoContext, { today: opts.today })
}
