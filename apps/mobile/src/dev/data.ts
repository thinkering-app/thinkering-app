import { router, type Href } from 'expo-router'
import { Platform } from 'react-native'
import { clearAllData, seedFixtureData } from '@thinkering/db'
import type { LocalDate } from '@thinkering/core'

import { db, repoContext } from '@/db'

/**
 * Dev-only data resets (docs/10 Tier 6), behind `DEV_TOOLS`. Clearing only
 * touches SQLite: the device token, a BYO key and a backup sign-in stay in
 * SecureStore, and backup is switched off by the settings going with it.
 */
export function resetLocalData(opts: { seed: boolean; today: LocalDate }): void {
  clearAllData(db)
  if (opts.seed) seedFixtureData(db, repoContext, { today: opts.today })
}

/**
 * Leaves for `href` with nothing held over from the old data. On web that is a
 * full page load, which also drops every screen's in-memory state; on native a
 * reload would re-deliver the deep link that got us here, so it navigates.
 */
export function reopenAt(href: Href & string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.replace(href)
    return
  }
  router.replace(href)
}
