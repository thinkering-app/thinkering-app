import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { colors } from '@/theme/tokens'

/**
 * The way into the reflection flow (docs/01 §5) — always on Path, and on Today
 * once three or fewer goals are left unstarted (the scheduler's
 * `showReflectCard`).
 */
export function ReflectCard({
  interestId,
  interestName,
}: {
  interestId: string
  interestName?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reflect on progress and update path"
      onPress={() => router.push(`/path/reflect?interestId=${interestId}`)}
      className="flex-row items-center gap-3 rounded-card border border-cornflower-tint bg-cornflower-tint p-4 active:opacity-80"
    >
      <Ionicons name="compass-outline" size={22} color={colors.cornflower.deep} />
      <View className="flex-1 gap-1">
        <Text className="font-heading text-body text-ink">Reflect on progress</Text>
        <Text className="font-sans text-secondary text-ink-soft">
          {interestName ? `${interestName} — update your path` : 'Update your path'}
        </Text>
      </View>
    </Pressable>
  )
}
