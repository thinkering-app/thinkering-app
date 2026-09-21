import { clearAllData } from '@thinkering/db'

import { isAnalyticsOptedIn, setAnalyticsConsent } from '@/analytics'
import { db } from '@/db'
import { currentAccount } from '@/sync/account'
import { deleteRemoteData } from '@/sync/engine'
import { withSyncPaused } from '@/sync/schedule'

/**
 * "Delete all data" (docs/01 §7): everything the learner has made goes for
 * good — from this device and, when an account is signed in, from the server
 * too, so nothing comes back on the next sync. It hard-deletes rather than
 * tombstoning: with the server copy gone there is nobody left to tell.
 *
 * What stays is the account itself (Me → Account deletes that) and SecureStore
 * — the device token and a BYO key, neither of which holds anything the learner
 * wrote — and a no to anonymous usage, which is on by default and would
 * otherwise come back with the empty settings table.
 */
export async function deleteAllData(): Promise<boolean> {
  return withSyncPaused(async () => {
    // The server copy first: if that fails, the device keeps its data rather than
    // losing it to a copy that would reappear on the next sync.
    if ((await currentAccount()) !== null && !(await deleteRemoteData())) return false
    const analyticsOff = !isAnalyticsOptedIn()
    clearAllData(db)
    if (analyticsOff) setAnalyticsConsent(false)
    return true
  })
}
