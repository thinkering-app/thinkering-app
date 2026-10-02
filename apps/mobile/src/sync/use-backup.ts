import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { getSyncCursors, isBackupEnabled, setBackupEnabled } from '@thinkering/db'

import { track } from '@/analytics'
import { db } from '@/db'
import { currentAccount, onAccountChange, type Account } from './account'
import { deleteRemoteData, syncNow, type SyncOutcome } from './engine'
import { withSyncPaused } from './schedule'
import { backupConfigured } from './supabase'

/** Me → Backup's read model: who is signed in, whether sync is on, how it went. */

export interface BackupState {
  configured: boolean
  account: Account | null
  enabled: boolean
  syncing: boolean
  lastSyncedAt: number | null
  error: string | null
}

export function useBackup() {
  const { t } = useTranslation()
  const [account, setAccount] = useState<Account | null>(null)
  const [enabled, setEnabled] = useState(() => isBackupEnabled(db))
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(
    () => getSyncCursors(db).lastSyncedAt,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void currentAccount().then(setAccount)
    return onAccountChange(setAccount)
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLastSyncedAt(getSyncCursors(db).lastSyncedAt)
      setEnabled(isBackupEnabled(db))
    }, []),
  )

  const settle = useCallback(
    (outcome: SyncOutcome) => {
      if (outcome.ok) {
        setLastSyncedAt(outcome.at)
        setError(null)
      } else if (outcome.reason === 'newer_schema') {
        setError(t('me.data.newerDeviceSchema'))
      } else if (outcome.reason === 'failed') {
        setError(t('me.data.syncUnreachable'))
      }
    },
    [t],
  )

  const runSync = useCallback(async () => {
    setSyncing(true)
    try {
      settle(await syncNow())
    } finally {
      setSyncing(false)
    }
  }, [settle])

  const turnOn = useCallback(async () => {
    setBackupEnabled(db, true)
    setEnabled(true)
    track('backup_enabled')
    await runSync()
  }, [runSync])

  /**
   * Off deletes the server copy (docs/02); the screen confirms before calling.
   * The delete and the setting that stops the next sync go together inside the
   * pause, so a push already in flight can't put the copy back.
   */
  const turnOff = useCallback(async () => {
    setSyncing(true)
    try {
      const deleted = await withSyncPaused(async () => {
        if (!(await deleteRemoteData())) return false
        setBackupEnabled(db, false)
        return true
      })
      if (!deleted) {
        setError(t('me.data.deleteBackupFailed'))
        return false
      }
      setEnabled(false)
      track('backup_disabled')
      setLastSyncedAt(null)
      setError(null)
      return true
    } finally {
      setSyncing(false)
    }
  }, [t])

  const state: BackupState = {
    configured: backupConfigured,
    account,
    enabled,
    syncing,
    lastSyncedAt,
    error,
  }
  return { ...state, runSync, turnOn, turnOff, setError }
}
