import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

import { ReplayMask } from '@/analytics'
import { Button } from '@/components/button'
import { TextField } from '@/components/text-field'
import { createAccount, currentAccount, sendPasswordReset, signIn } from './account'

export type AccountFormMode = 'sign_in' | 'create'

type AccountFormProps = {
  mode: AccountFormMode
  /** Called once there is a session — not after a sign-up still waiting on its email. */
  onSignedIn: () => void
}

/**
 * Email and password for the backup account, shared by Me → Account and the
 * returning-user sign-in on the intake welcome (docs/01 §1, §7). What happens
 * after a session exists is the caller's.
 */
export function AccountForm({ mode, onSignedIn }: AccountFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A switch between sign-in and create starts the feedback over, keeping what was typed.
  const [shownMode, setShownMode] = useState(mode)
  if (shownMode !== mode) {
    setShownMode(mode)
    setError(null)
    setMessage(null)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result =
        mode === 'create' ? await createAccount(email, password) : await signIn(email, password)
      if (!result.ok) return setError(result.message)

      if (!(await currentAccount())) {
        // Sign-up with email confirmation on: there is no session until they click.
        setMessage(t('me.account.confirmEmailMessage'))
        return
      }
      onSignedIn()
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    setError(null)
    setMessage(null)
    const result = await sendPasswordReset(email)
    if (result.ok) setMessage(t('me.account.resetLinkSent'))
    else setError(result.message)
  }

  return (
    <>
      <View className="gap-3">
        <ReplayMask>
          <View className="gap-3">
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder={t('me.account.emailLabel')}
              accessibilityLabel={t('me.account.emailLabel')}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder={t('me.account.passwordLabel')}
              accessibilityLabel={t('me.account.passwordLabel')}
              secureTextEntry
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              autoCapitalize="none"
            />
          </View>
        </ReplayMask>
        <Button
          label={
            busy
              ? t('me.account.oneMoment')
              : mode === 'create'
                ? t('me.account.createButton')
                : t('me.account.signInButton')
          }
          onPress={() => void submit()}
          disabled={busy || email.trim() === '' || password.length < 8}
        />
      </View>

      <FormFeedback message={message} error={error} />

      {mode === 'sign_in' && email.trim() !== '' ? (
        <TextLink label={t('me.account.sendResetLink')} onPress={() => void resetPassword()} />
      ) : null}
    </>
  )
}

export function FormFeedback({ message, error }: { message: string | null; error: string | null }) {
  if (error) return <Text className="font-sans text-secondary text-peach">{error}</Text>
  if (message) return <Text className="font-sans text-secondary text-ink-soft">{message}</Text>
  return null
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text className="font-sans-medium text-secondary text-cornflower">{label}</Text>
    </Pressable>
  )
}
