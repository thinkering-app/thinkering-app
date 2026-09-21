import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable } from 'react-native'

import { colors } from '@/theme/tokens'

/** The ⚙ to Me's settings, in the top-right of every tab (docs/01 §7). */
export function SettingsButton({ testID }: { testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/me/settings')}
      hitSlop={10}
    >
      <Ionicons name="settings-outline" size={22} color={colors.ink.soft} />
    </Pressable>
  )
}
