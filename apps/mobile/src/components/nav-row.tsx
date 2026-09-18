import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text } from 'react-native'

import { colors } from '@/theme/tokens'

type NavRowProps = {
  label: string
  onPress: () => void
  /** Stable handle for the Maestro flows (docs/10 Tier 6); label matching is flaky. */
  testID?: string
}

/** A row that opens a screen: label, chevron, nothing else (docs/07). */
export function NavRow({ label, onPress, testID }: NavRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center justify-between rounded-card border border-hairline bg-surface px-4 py-4 active:bg-cornflower-tint"
    >
      <Text className="font-sans-medium text-body text-ink">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.ink.soft} />
    </Pressable>
  )
}
