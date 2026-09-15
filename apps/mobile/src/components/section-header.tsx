import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text, View } from 'react-native'
import type { Section } from '@thinkering/core'

import { colors } from '@/theme/tokens'

type SectionHeaderProps = {
  section: Section
  /** Activities completed in this section today; drives the wash and the count (docs/01 §3). */
  completedToday?: number
  onConfigure?: () => void
}

export const SECTION_LABELS: Record<Section, string> = {
  next: 'Next',
  strengthen: 'Strengthen',
  go_further: 'Go further',
}

const ACCENT: Record<Section, { wash: string; text: string; color: string }> = {
  next: { wash: 'bg-cornflower-tint', text: 'text-cornflower-deep', color: colors.cornflower.deep },
  strengthen: { wash: 'bg-leaf-tint', text: 'text-leaf', color: colors.leaf.DEFAULT },
  go_further: { wash: 'bg-peach-tint', text: 'text-peach', color: colors.peach.DEFAULT },
}

/**
 * Today's section heading (docs/07). Completing something in a section today
 * washes the heading in the section's accent and shows the count — it
 * celebrates, it doesn't lock: the remaining cards stay.
 */
export function SectionHeader({ section, completedToday = 0, onConfigure }: SectionHeaderProps) {
  const accent = ACCENT[section]
  const done = completedToday > 0
  return (
    <View
      className={`flex-row items-center justify-between rounded-card px-3 py-2 ${done ? accent.wash : ''}`}
    >
      <View className="flex-row items-baseline gap-2">
        <Text className={`font-heading-bold text-heading ${done ? accent.text : 'text-ink'}`}>
          {SECTION_LABELS[section]}
        </Text>
        {done ? (
          <Text className="font-sans text-caption text-ink-soft">{completedToday} today</Text>
        ) : null}
      </View>
      {onConfigure ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Configure ${SECTION_LABELS[section]}`}
          onPress={onConfigure}
          hitSlop={12}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={done ? accent.color : colors.ink.soft}
          />
        </Pressable>
      ) : null}
    </View>
  )
}
