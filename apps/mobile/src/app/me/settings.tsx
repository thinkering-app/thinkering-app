import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { isInspectorEnabled } from '@/ai/settings'
import { NavRow } from '@/components/nav-row'
import { SubScreen } from '@/components/sub-screen'

/**
 * Me → Settings (docs/01 §7): five categories, each its own screen. Reached
 * from the ⚙ in the Me header so the tab itself stays the interests and the
 * calendar.
 */
export default function SettingsScreen() {
  // Revealed by the long-press on About, so re-read it whenever we come back.
  const [developer, setDeveloper] = useState(() => isInspectorEnabled())
  useFocusEffect(useCallback(() => setDeveloper(isInspectorEnabled()), []))

  return (
    <SubScreen title="Settings">
      <View className="gap-2">
        <NavRow
          testID="settings-data"
          label="Account and data"
          onPress={() => router.push('/me/data')}
        />
        <NavRow testID="settings-ai" label="AI" onPress={() => router.push('/me/ai')} />
        <NavRow label="Privacy" onPress={() => router.push('/me/privacy')} />
        <NavRow label="Feedback" onPress={() => router.push('/me/feedback')} />
        <NavRow testID="settings-about" label="About" onPress={() => router.push('/me/about')} />
        {developer ? (
          <NavRow label="Developer" onPress={() => router.push('/me/developer')} />
        ) : null}
      </View>
    </SubScreen>
  )
}
