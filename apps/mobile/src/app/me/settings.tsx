import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { isInspectorEnabled } from '@/ai/settings'
import { NavRow } from '@/components/nav-row'
import { SubScreen } from '@/components/sub-screen'

/**
 * Me → Settings (docs/01 §7): one row per category, each its own screen.
 * Reached from the ⚙ in the Me header so the tab itself stays the interests
 * and the calendar.
 */
export default function SettingsScreen() {
  const { t } = useTranslation()
  // Revealed by the long-press on About, so re-read it whenever we come back.
  const [developer, setDeveloper] = useState(() => isInspectorEnabled())
  useFocusEffect(useCallback(() => setDeveloper(isInspectorEnabled()), []))

  return (
    <SubScreen title={t('me.settings.title')}>
      <View className="gap-2">
        <NavRow
          testID="settings-data"
          label={t('me.settings.data')}
          onPress={() => router.push('/me/data')}
        />
        <NavRow
          testID="settings-ai"
          label={t('me.settings.ai')}
          onPress={() => router.push('/me/ai')}
        />
        <NavRow
          testID="settings-language"
          label={t('me.settings.language')}
          onPress={() => router.push('/me/language')}
        />
        <NavRow label={t('me.settings.privacy')} onPress={() => router.push('/me/privacy')} />
        <NavRow label={t('me.settings.feedback')} onPress={() => router.push('/me/feedback')} />
        <NavRow
          testID="settings-about"
          label={t('me.settings.about')}
          onPress={() => router.push('/me/about')}
        />
        {developer ? (
          <NavRow label={t('me.settings.developer')} onPress={() => router.push('/me/developer')} />
        ) : null}
      </View>
    </SubScreen>
  )
}
