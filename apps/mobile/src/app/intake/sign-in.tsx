import { router } from 'expo-router'
import { useEffect, useState } from 'react'
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

  if (!loaded) return <SubScreen title="Sign in" />

  if (restoring) {
    return (
      <SubScreen title="Sign in">
        <Text className="font-sans text-body text-ink-soft">Bringing back your learning…</Text>
      </SubScreen>
    )
  }

  if (account) {
    return (
      <SubScreen title="Sign in">
        <ReplayMask>
          <Text className="font-sans text-body text-ink">{account.email}</Text>
        </ReplayMask>
        <Button label={error ? 'Try again' : 'Continue'} onPress={() => void restore()} />
        <FormFeedback message={null} error={error} />
        <TextLink label="Use a different account" onPress={() => void switchAccount()} />
      </SubScreen>
    )
  }

  return (
    <SubScreen title="Sign in">
      <AccountForm mode="sign_in" onSignedIn={() => void signedIn()} />
    </SubScreen>
  )
}
