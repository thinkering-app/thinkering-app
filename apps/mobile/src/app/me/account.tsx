import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      setMessage(t('me.account.passwordChanged'))
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
      title: t('me.account.deleteAccountTitle'),
      message: t('me.account.deleteAccountMessage'),
      confirmLabel: t('me.account.deleteAccount'),
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

  if (!loaded) return <SubScreen title={t('me.account.title')} />

  if (account) {
    return (
      <SubScreen title={t('me.account.title')}>
        <ReplayMask>
          <Text className="font-sans text-body text-ink">{account.email}</Text>
        </ReplayMask>
        <View className="gap-3">
          <ReplayMask>
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder={t('me.account.newPasswordLabel')}
              accessibilityLabel={t('me.account.newPasswordLabel')}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
            />
          </ReplayMask>
          <Button
            label={busy ? t('me.account.saving') : t('me.account.changePassword')}
            onPress={() => void savePassword()}
            disabled={busy || password.length < 8}
          />
        </View>
        <FormFeedback message={message} error={error} />
        <View className="gap-2 border-t border-hairline pt-6">
          <Button
            label={t('me.account.deleteAccount')}
            variant="quiet"
            onPress={() => void removeAccount()}
            disabled={busy}
          />
          <Text className="font-sans text-caption text-ink-soft">
            {t('me.account.deleteAccountCaption')}
          </Text>
        </View>
      </SubScreen>
    )
  }

  return (
    <SubScreen
      title={mode === 'create' ? t('me.account.createTitle') : t('me.account.signInTitle')}
    >
      <AccountForm mode={mode} onSignedIn={signedIn} />
      <TextLink
        label={
          mode === 'create' ? t('me.account.alreadyHaveAccount') : t('me.account.createAccountLink')
        }
        onPress={() => setMode(mode === 'create' ? 'sign_in' : 'create')}
      />
    </SubScreen>
  )
}
