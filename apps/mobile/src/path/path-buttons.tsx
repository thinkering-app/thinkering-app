import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable } from 'react-native'

import { colors } from '@/theme/tokens'

/**
 * The interest's Resources and Path settings (docs/01 §5), beside the ⚙ on
 * Today, Path and History. Both are per-interest, so a screen shows them only
 * with a single interest in view.
 */
export function PathButtons({ interestId }: { interestId: string }) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resources"
        onPress={() => router.push(`/path/resources?interestId=${interestId}`)}
        hitSlop={10}
      >
        <Ionicons name="book-outline" size={22} color={colors.ink.soft} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Path settings"
        onPress={() => router.push(`/path/settings?interestId=${interestId}`)}
        hitSlop={10}
      >
        <Ionicons name="options-outline" size={22} color={colors.ink.soft} />
      </Pressable>
    </>
  )
}
