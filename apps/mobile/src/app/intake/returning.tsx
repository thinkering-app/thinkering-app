import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { importFromFile, refusalMessage } from '@/backup/actions'
import { Button } from '@/components/button'
import { SubScreen } from '@/components/sub-screen'

/**
 * Two ways back in on a fresh install (docs/01 §1): the account behind synced
 * backup, or a file they kept. Only reached when the build has a Supabase
 * project — without one, the welcome goes straight to the file.
 */
export default function ReturningScreen() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  // Nothing is on the device yet, so there is nothing to confirm replacing.
  const restore = async () => {
    setError(null)
    const outcome = await importFromFile()
    if (outcome.ok) router.replace('/today')
    else if (outcome.reason !== 'cancelled') setError(refusalMessage(outcome.reason))
  }

  return (
    <SubScreen title={t('intake.returning.title')}>
      <View className="gap-3">
        <Button
          label={t('intake.returning.signIn')}
          onPress={() => router.push('/intake/sign-in')}
        />
        <Button
          label={t('intake.returning.restoreFile')}
          variant="quiet"
          onPress={() => void restore()}
        />
      </View>
      {error ? <Text className="font-sans text-secondary text-peach">{error}</Text> : null}
    </SubScreen>
  )
}
