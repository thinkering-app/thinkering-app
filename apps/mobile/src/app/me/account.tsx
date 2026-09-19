import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { resetSyncCursors, setBackupEnabled } from '@thinkering/db'

import { ReplayMask } from '@/analytics'
import { Button } from '@/components/button'
import { confirmDestructive } from '@/components/confirm'
import { SubScreen } from '@/components/sub-screen'
import { TextField } from '@/components/text-field'
import { db } from '@/db'
import { changePassword, currentAccount, deleteAccount, type Account } from '@/sync/account'
import { AccountForm, FormFeedback, TextLink, type AccountFormMode } from '@/sync/account-form'
import { scheduleSync } from '@/sync/schedule'

/**
 * The account behind synced backup (docs/01 §7, docs/02 §Backup & sync). Signed
 * out it is sign-in or create; signed in it is only the password. Nothing else
 * in the app has an account, so this screen is the whole of it.
 */

export default function AccountScreen() {
  const [account, setAccount] = useState<Account | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<AccountFormMode>('sign_in')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void currentAccount().then((found) => {
      setAccount(found)
      setLoaded(true)
    })
  }, [])

  const savePassword = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await changePassword(password)
      if (!result.ok) return setError(result.message)
      setPassword('')
      setMessage('Password changed.')
    } finally {
      setBusy(false)
    }
  }

  const signedIn = () => {
    // Reaching this screen at all means they want the backup on.
    setBackupEnabled(db, true)
    scheduleSync(0)
    router.back()
  }

  /**
   * Deleting the account, not the data on this device (App Review 5.1.1(v)).
   * The local library is the source of truth, so it stays — what goes is the
   * account and everything on the server.
   */
  const removeAccount = async () => {
    const confirmed = await confirmDestructive({
      title: 'Delete your account?',
      message:
        'Your account and the copy on our server are deleted for good. Your learning stays on this device.',
      confirmLabel: 'Delete account',
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await deleteAccount()
      if (!result.ok) return setError(result.message)
      setBackupEnabled(db, false)
      resetSyncCursors(db)
      router.back()
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <SubScreen title="Account" />

  if (account) {
    return (
      <SubScreen title="Account">
        <ReplayMask>
          <Text className="font-sans text-body text-ink">{account.email}</Text>
        </ReplayMask>
        <View className="gap-3">
          <ReplayMask>
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              accessibilityLabel="New password"
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
            />
          </ReplayMask>
          <Button
            label={busy ? 'Saving…' : 'Change password'}
            onPress={() => void savePassword()}
            disabled={busy || password.length < 8}
          />
        </View>
        <FormFeedback message={message} error={error} />
        <View className="gap-2 border-t border-hairline pt-6">
          <Button
            label="Delete account"
            variant="quiet"
            onPress={() => void removeAccount()}
            disabled={busy}
          />
          <Text className="font-sans text-caption text-ink-soft">
            Deletes the account and the copy on our server. Your learning stays on this device.
          </Text>
        </View>
      </SubScreen>
    )
  }

  return (
    <SubScreen title={mode === 'create' ? 'Create an account' : 'Sign in'}>
      <AccountForm mode={mode} onSignedIn={signedIn} />
      <TextLink
        label={mode === 'create' ? 'I already have an account' : 'Create an account'}
        onPress={() => setMode(mode === 'create' ? 'sign_in' : 'create')}
      />
    </SubScreen>
  )
}
