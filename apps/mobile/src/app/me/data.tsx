import { router } from 'expo-router'
import { useState } from 'react'
import { Switch, Text, View } from 'react-native'

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
import { signOutAndForget } from '@/sync/engine'
import { useBackup } from '@/sync/use-backup'
import { colors } from '@/theme/tokens'

/**
 * Me → Settings → Account and data (docs/01 §7): a file you keep, and — off by
 * default — a synced copy in your own account. Turning sync off deletes the
 * server copy. The anonymous-analytics opt-in (D9) and the separate session
 * replay opt-in are here too: they are about what leaves the device, not about
 * the model.
 */

export default function DataScreen() {
  const backup = useBackup()
  const [optedIn, setOptedIn] = useState(() => isAnalyticsOptedIn())
  const [replayOptedIn, setReplayOptedIn] = useState(() => isReplayOptedIn())
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const runExport = async () => {
    setBusy('export')
    setFileError(null)
    try {
      await exportToFile(Date.now())
    } catch {
      setFileError("We couldn't write the file.")
    } finally {
      setBusy(null)
    }
  }

  const runImport = async () => {
    setFileError(null)
    const confirmed = await confirmDestructive({
      title: 'Replace everything on this device?',
      message: 'Your interests, path, and history here are replaced by the backup.',
      confirmLabel: 'Choose a file',
    })
    if (!confirmed) return

    setBusy('import')
    try {
      const outcome = await importFromFile()
      if (outcome.ok) setToast('Backup restored')
      else if (outcome.reason !== 'cancelled') setFileError(refusalMessage(outcome.reason))
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
      title: 'Turn off backup?',
      message: 'The copy on our server is deleted. What is on this device stays.',
      confirmLabel: 'Turn off and delete',
    })
    if (confirmed && (await backup.turnOff())) setToast('Server copy deleted')
  }

  return (
    <SubScreen title="Account and data">
      {backup.configured ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">Synced backup</Text>
          {backup.account ? (
            <>
              <View className="flex-row items-center gap-4">
                <View className="flex-1">
                  <ReplayMask>
                    <Text className="font-sans text-body text-ink">{backup.account.email}</Text>
                  </ReplayMask>
                </View>
                <Switch
                  value={backup.enabled}
                  disabled={backup.syncing}
                  onValueChange={(next) => void toggleSync(next)}
                  trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
                  thumbColor={colors.surface}
                />
              </View>
              <Text className="font-sans text-caption text-ink-soft">{statusLine(backup)}</Text>
              {backup.enabled ? (
                <Button
                  label={backup.syncing ? 'Backing up…' : 'Back up now'}
                  variant="quiet"
                  onPress={() => void backup.runSync()}
                  disabled={backup.syncing}
                />
              ) : null}
              <Button
                label="Change password"
                variant="quiet"
                onPress={() => router.push('/me/account')}
              />
              <Button label="Sign out" variant="quiet" onPress={() => void signOutAndForget()} />
            </>
          ) : (
            <>
              <Text className="font-sans text-secondary text-ink-soft">
                Off by default. With an account, your learning is kept on our server too, and a new
                device picks up where this one left off.
              </Text>
              <Button
                label="Sign in or create an account"
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
        <Text className="font-heading-bold text-heading text-ink">A file you keep</Text>
        <Text className="font-sans text-secondary text-ink-soft">
          Everything you&apos;ve made, as one JSON file. Importing replaces what&apos;s on this
          device.
        </Text>
        <Button
          testID="backup-export"
          label={busy === 'export' ? 'Exporting…' : 'Export data'}
          onPress={() => void runExport()}
          disabled={busy !== null}
        />
        <Button
          testID="backup-import"
          label={busy === 'import' ? 'Importing…' : 'Import data'}
          variant="quiet"
          onPress={() => void runImport()}
          disabled={busy !== null}
        />
        {fileError ? (
          <Text className="font-sans text-secondary text-peach">{fileError}</Text>
        ) : null}
      </View>

      <View className="gap-3">
        <Text className="font-heading-bold text-heading text-ink">Anonymous usage</Text>
        <View className="flex-row items-center gap-4">
          <Text className="flex-1 font-sans text-body text-ink">
            Share anonymous usage to improve thinkering
          </Text>
          <Switch
            value={optedIn}
            onValueChange={(next) => {
              // A yes here flushes the pre-consent buffer; a no deletes it (docs/08).
              setAnalyticsConsent(next)
              setOptedIn(next)
              if (next) track('settings_changed', { key: 'analytics_opt_in' })
            }}
            trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
            thumbColor={colors.surface}
          />
        </View>
        <Text className="font-sans text-caption text-ink-soft">
          Counts and ratings only — never what you write, learn, or look at. Not linked to you.
        </Text>
      </View>

      {isReplayAvailable() ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">Session replays</Text>
          <View className="flex-row items-center gap-4">
            <Text className="flex-1 font-sans text-body text-ink">
              Share session replays with developers
            </Text>
            <Switch
              value={replayOptedIn}
              onValueChange={(next) => {
                setReplayConsent(next)
                setReplayOptedIn(next)
                track('settings_changed', { key: 'session_replay_opt_in' })
              }}
              trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
              thumbColor={colors.surface}
            />
          </View>
          <Text className="font-sans text-caption text-ink-soft">
            Screen recordings of your sessions help us fix problems and see how learning here feels.
            They aren&apos;t linked to you, but they show what&apos;s on screen — your activities
            and what you type.
          </Text>
        </View>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}

function statusLine({
  enabled,
  syncing,
  lastSyncedAt,
}: {
  enabled: boolean
  syncing: boolean
  lastSyncedAt: number | null
}): string {
  if (!enabled) return 'Nothing is on the server.'
  if (syncing) return 'Backing up…'
  if (lastSyncedAt === null) return 'Not backed up yet.'
  const at = new Date(lastSyncedAt)
  const sameDay = at.toDateString() === new Date().toDateString()
  return `Last backed up ${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
  }).format(at)}`
}
