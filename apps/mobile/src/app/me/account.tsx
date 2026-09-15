import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { resetSyncCursors, setBackupEnabled } from '@thinkering/db'

import { Button } from '@/components/button'
import { confirmDestructive } from '@/components/confirm'
import { SubScreen } from '@/components/sub-screen'
import { TextField } from '@/components/text-field'
import { db } from '@/db'
import {
  changePassword,
  createAccount,
  currentAccount,
  deleteAccount,
  sendPasswordReset,
  signIn,
  type Account,
} from '@/sync/account'
import { scheduleSync } from '@/sync/schedule'

/**
 * The account behind synced backup (docs/01 §7, docs/02 §Backup & sync). Signed
 * out it is sign-in or create; signed in it is only the password. Nothing else
 * in the app has an account, so this screen is the whole of it.
 */

type Mode = 'sign_in' | 'create'

export default function AccountScreen() {
  const [account, setAccount] = useState<Account | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
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

  const submit = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (account) {
        const result = await changePassword(password)
        if (!result.ok) return setError(result.message)
        setPassword('')
        setMessage('Password changed.')
        return
      }

      const result = mode === 'create' ? await createAccount(email, password) : await signIn(email, password)
      if (!result.ok) return setError(result.message)

      const signedIn = await currentAccount()
      if (!signedIn) {
        // Sign-up with email confirmation on: there is no session until they click.
        setMessage('Check your email to confirm the account, then sign in.')
        return
      }
      // Reaching this screen at all means they want the backup on.
      setBackupEnabled(db, true)
      scheduleSync(0)
      router.back()
    } finally {
      setBusy(false)
    }
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

  const resetPassword = async () => {
    setError(null)
    setMessage(null)
    const result = await sendPasswordReset(email)
    if (result.ok) setMessage('We sent a reset link to that address.')
    else setError(result.message)
  }

  if (!loaded) return <SubScreen title="Account" />

  if (account) {
    return (
      <SubScreen title="Account">
        <Text className="font-sans text-body text-ink">{account.email}</Text>
        <View className="gap-3">
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            accessibilityLabel="New password"
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
          />
          <Button
            label={busy ? 'Saving…' : 'Change password'}
            onPress={() => void submit()}
            disabled={busy || password.length < 8}
          />
        </View>
        <Feedback message={message} error={error} />
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
      <View className="gap-3">
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          accessibilityLabel="Email"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
        />
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          accessibilityLabel="Password"
          secureTextEntry
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          autoCapitalize="none"
        />
        <Button
          label={busy ? 'One moment…' : mode === 'create' ? 'Create account' : 'Sign in'}
          onPress={() => void submit()}
          disabled={busy || email.trim() === '' || password.length < 8}
        />
      </View>

      <Feedback message={message} error={error} />

      <View className="gap-4">
        <Link
          label={mode === 'create' ? 'I already have an account' : 'Create an account'}
          onPress={() => {
            setMode(mode === 'create' ? 'sign_in' : 'create')
            setError(null)
            setMessage(null)
          }}
        />
        {mode === 'sign_in' && email.trim() !== '' ? (
          <Link label="Send me a reset link" onPress={() => void resetPassword()} />
        ) : null}
      </View>
    </SubScreen>
  )
}

function Feedback({ message, error }: { message: string | null; error: string | null }) {
  if (error) return <Text className="font-sans text-secondary text-peach">{error}</Text>
  if (message) return <Text className="font-sans text-secondary text-ink-soft">{message}</Text>
  return null
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text className="font-sans-medium text-secondary text-cornflower">{label}</Text>
    </Pressable>
  )
}
