import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'

import { ReplayMask } from '@/analytics'
import { Button } from '@/components/button'
import { SubScreen } from '@/components/sub-screen'
import { currentAccount, type Account } from '@/sync/account'
import { AccountForm, FormFeedback, TextLink } from '@/sync/account-form'
import { signOutAndForget } from '@/sync/engine'
import { restoreFromAccount } from '@/sync/restore'

/**
 * Signing in from the intake welcome (docs/01 §1). The first sync brings the
 * account's learning down; with none there, they carry on into intake signed in.
 * Sign-up stays in Me → Account — an account is worth making once there is
 * something to keep.
 */
export default function IntakeSignInScreen() {
  const { t } = useTranslation()
  // The keychain outlives a reinstall, so a fresh install can already be signed in.
  const [account, setAccount] = useState<Account | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void currentAccount().then((found) => {
      setAccount(found)
      setLoaded(true)
    })
  }, [])

  const restore = async () => {
    setRestoring(true)
    setError(null)
    const result = await restoreFromAccount()
    if (!result.ok) {
      setRestoring(false)
      setError(result.message)
      return
    }
    router.replace(result.hasInterests ? '/today' : '/intake/learn')
  }

  const signedIn = async () => {
    setAccount(await currentAccount())
    await restore()
  }

  const switchAccount = async () => {
    await signOutAndForget()
    setAccount(null)
    setError(null)
  }

  if (!loaded) return <SubScreen title={t('intake.signIn.title')} />

  if (restoring) {
    return (
      <SubScreen title={t('intake.signIn.title')}>
        <Text className="font-sans text-body text-ink-soft">{t('intake.signIn.restoring')}</Text>
      </SubScreen>
    )
  }

  if (account) {
    return (
      <SubScreen title={t('intake.signIn.title')}>
        <ReplayMask>
          <Text className="font-sans text-body text-ink">{account.email}</Text>
        </ReplayMask>
        <Button
          label={error ? t('common.tryAgain') : t('common.continue')}
          onPress={() => void restore()}
        />
        <FormFeedback message={null} error={error} />
        <TextLink label={t('intake.signIn.switchAccount')} onPress={() => void switchAccount()} />
      </SubScreen>
    )
  }

  return (
    <SubScreen title={t('intake.signIn.title')}>
      <AccountForm mode="sign_in" onSignedIn={() => void signedIn()} />
    </SubScreen>
  )
}
