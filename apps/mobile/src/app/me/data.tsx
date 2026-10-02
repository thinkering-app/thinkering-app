import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Text, View } from 'react-native'

import { exportToFile, importFromFile, refusalMessage } from '@/backup/actions'
import {
  isAnalyticsOptedIn,
  isReplayAvailable,
  isReplayOptedIn,
  ReplayMask,
  setAnalyticsConsent,
  setReplayConsent,
  track,
} from '@/analytics'
import { Button } from '@/components/button'
import { confirmDestructive } from '@/components/confirm'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'
import { Toggle } from '@/components/toggle'
import { currentFormatLocale } from '@/i18n'
import { deleteAllData } from '@/me/delete-all'
import { reopenAt } from '@/reopen'
import { signOutAndForget } from '@/sync/engine'
import { useBackup } from '@/sync/use-backup'

/**
 * Me → Settings → Account and data (docs/01 §7): a file you keep, and — off by
 * default — a synced copy in your own account. Turning sync off deletes the
 * server copy, and Delete all data deletes the learning itself. The
 * anonymous-usage toggle (on by default, D9) and the separate session replay
 * opt-in are here too: they are about what leaves the device, not about the
 * model.
 */

export default function DataScreen() {
  const { t } = useTranslation()
  const backup = useBackup()
  const [optedIn, setOptedIn] = useState(() => isAnalyticsOptedIn())
  const [replayOptedIn, setReplayOptedIn] = useState(() => isReplayOptedIn())
  const [busy, setBusy] = useState<'export' | 'import' | 'delete' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const runExport = async () => {
    setBusy('export')
    setFileError(null)
    try {
      await exportToFile(Date.now())
    } catch {
      setFileError(t('me.data.writeFileFailed'))
    } finally {
      setBusy(null)
    }
  }

  const runImport = async () => {
    setFileError(null)
    const confirmed = await confirmDestructive({
      title: t('me.data.replaceEverythingTitle'),
      message: t('me.data.replaceEverythingMessage'),
      confirmLabel: t('me.data.chooseFile'),
    })
    if (!confirmed) return

    setBusy('import')
    try {
      const outcome = await importFromFile()
      if (outcome.ok) setToast(t('me.data.backupRestored'))
      else if (outcome.reason !== 'cancelled') setFileError(refusalMessage(outcome.reason))
    } finally {
      setBusy(null)
    }
  }

  const runDelete = async () => {
    setDeleteError(null)
    const confirmed = await confirmDestructive({
      title: t('me.data.deleteAllTitle'),
      message: backup.account
        ? t('me.data.deleteAllMessageWithServer')
        : t('me.data.deleteAllMessage'),
      confirmLabel: t('me.data.deleteAllConfirm'),
    })
    if (!confirmed) return

    setBusy('delete')
    try {
      if (await deleteAllData()) reopenAt('/intake/welcome')
      else setDeleteError(t('me.data.deleteAllFailed'))
    } finally {
      setBusy(null)
    }
  }

  const toggleSync = async (next: boolean) => {
    if (next) {
      await backup.turnOn()
      return
    }
    const confirmed = await confirmDestructive({
      title: t('me.data.turnOffTitle'),
      message: t('me.data.turnOffMessage'),
      confirmLabel: t('me.data.turnOffConfirm'),
    })
    if (confirmed && (await backup.turnOff())) setToast(t('me.data.serverCopyDeleted'))
  }

  return (
    <SubScreen title={t('me.data.title')}>
      {backup.configured ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">
            {t('me.data.syncedBackupHeading')}
          </Text>
          {backup.account ? (
            <>
              <View className="flex-row items-center gap-4">
                <View className="flex-1">
                  <ReplayMask>
                    <Text className="font-sans text-body text-ink">{backup.account.email}</Text>
                  </ReplayMask>
                </View>
                <Toggle
                  value={backup.enabled}
                  disabled={backup.syncing}
                  onValueChange={(next) => void toggleSync(next)}
                />
              </View>
              <Text className="font-sans text-caption text-ink-soft">{statusLine(backup, t)}</Text>
              {backup.enabled ? (
                <Button
                  label={backup.syncing ? t('me.data.backingUp') : t('me.data.backUpNow')}
                  variant="quiet"
                  onPress={() => void backup.runSync()}
                  disabled={backup.syncing}
                />
              ) : null}
              <Button
                label={t('me.account.changePassword')}
                variant="quiet"
                onPress={() => router.push('/me/account')}
              />
              <Button
                label={t('me.data.signOut')}
                variant="quiet"
                onPress={() => void signOutAndForget()}
              />
            </>
          ) : (
            <>
              <Text className="font-sans text-secondary text-ink-soft">
                {t('me.data.offByDefaultExplainer')}
              </Text>
              <Button
                label={t('me.data.signInOrCreate')}
                onPress={() => router.push('/me/account')}
              />
            </>
          )}
          {backup.error ? (
            <Text className="font-sans text-secondary text-peach">{backup.error}</Text>
          ) : null}
        </View>
      ) : null}

      <View className="gap-3">
        <Text className="font-heading-bold text-heading text-ink">{t('me.data.fileHeading')}</Text>
        <Text className="font-sans text-secondary text-ink-soft">{t('me.data.fileExplainer')}</Text>
        <Button
          testID="backup-export"
          label={busy === 'export' ? t('me.data.exporting') : t('me.data.exportData')}
          onPress={() => void runExport()}
          disabled={busy !== null}
        />
        <Button
          testID="backup-import"
          label={busy === 'import' ? t('me.data.importing') : t('me.data.importData')}
          variant="quiet"
          onPress={() => void runImport()}
          disabled={busy !== null}
        />
        {fileError ? (
          <Text className="font-sans text-secondary text-peach">{fileError}</Text>
        ) : null}
      </View>

      <View className="gap-3">
        <Text className="font-heading-bold text-heading text-ink">
          {t('me.data.anonymousUsageHeading')}
        </Text>
        <View className="flex-row items-center gap-4">
          <Text className="flex-1 font-sans text-body text-ink">
            {t('me.data.shareAnonymousUsage')}
          </Text>
          <Toggle
            value={optedIn}
            onValueChange={(next) => {
              setAnalyticsConsent(next)
              setOptedIn(next)
              if (next) track('settings_changed', { key: 'analytics_opt_in' })
            }}
          />
        </View>
        <Text className="font-sans text-caption text-ink-soft">
          {t('me.data.anonymousUsageCaption')}
        </Text>
      </View>

      {isReplayAvailable() ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">
            {t('me.data.sessionReplaysHeading')}
          </Text>
          <View className="flex-row items-center gap-4">
            <Text className="flex-1 font-sans text-body text-ink">
              {t('me.data.shareSessionReplays')}
            </Text>
            <Toggle
              value={replayOptedIn}
              onValueChange={(next) => {
                setReplayConsent(next)
                setReplayOptedIn(next)
                track('settings_changed', { key: 'session_replay_opt_in' })
              }}
            />
          </View>
          <Text className="font-sans text-caption text-ink-soft">
            {t('me.data.replayExplainer')}
          </Text>
        </View>
      ) : null}

      <View className="gap-2 border-t border-hairline pt-6">
        <Button
          testID="delete-all-data"
          label={busy === 'delete' ? t('me.data.deleting') : t('me.data.deleteAll')}
          variant="quiet"
          onPress={() => void runDelete()}
          disabled={busy !== null}
        />
        <Text className="font-sans text-caption text-ink-soft">
          {t('me.data.deleteAllCaption')}
        </Text>
        {deleteError ? (
          <Text className="font-sans text-secondary text-peach">{deleteError}</Text>
        ) : null}
      </View>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}

function statusLine(
  {
    enabled,
    syncing,
    lastSyncedAt,
  }: {
    enabled: boolean
    syncing: boolean
    lastSyncedAt: number | null
  },
  t: TFunction,
): string {
  if (!enabled) return t('me.data.nothingOnServer')
  if (syncing) return t('me.data.backingUp')
  if (lastSyncedAt === null) return t('me.data.notBackedUpYet')
  const at = new Date(lastSyncedAt)
  const sameDay = at.toDateString() === new Date().toDateString()
  const time = new Intl.DateTimeFormat(currentFormatLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
  }).format(at)
  return t('me.data.lastBackedUp', { time })
}
