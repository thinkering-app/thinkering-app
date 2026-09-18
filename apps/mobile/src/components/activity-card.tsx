import Ionicons from '@expo/vector-icons/Ionicons'
import { Text, View } from 'react-native'
import type { Section } from '@thinkering/core'

import { PressScale } from '@/components/press-scale'
import { colors } from '@/theme/tokens'

type ActivityCardProps = {
  title: string
  /** The goal this targets — or the prerequisite topic, for the early-days card. */
  goalLine: string
  estMinutes: number
  section: Section
  /** Shown instead of the time chip once the card has been completed today. */
  completed?: boolean
  /** Left mid-activity today — resumable for the rest of the day (docs/05). */
  inProgress?: boolean
  /** For Explore → All, where cards from several interests share a section. */
  interestName?: string
  onPress?: () => void
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}

// The landing page's card language: a small accent swatch on white carries the
// section colour, and the meta chip picks up its tint (docs/07 §Sections).
const ACCENT: Record<Section, { swatch: string; chip: string }> = {
  next: { swatch: 'bg-cornflower', chip: 'bg-cornflower-tint' },
  strengthen: { swatch: 'bg-leaf', chip: 'bg-leaf-tint' },
  go_further: { swatch: 'bg-peach', chip: 'bg-peach-tint' },
}

/** A Today card (docs/01 §3): what it is, the goal it moves, how long it takes. */
export function ActivityCard({
  title,
  goalLine,
  estMinutes,
  section,
  completed = false,
  inProgress = false,
  interestName,
  onPress,
  testID,
}: ActivityCardProps) {
  return (
    <PressScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${goalLine}. ${
        completed ? 'Done today' : inProgress ? 'Continue' : `${estMinutes} minutes`
      }`}
      onPress={onPress}
      className={`w-72 gap-2 rounded-card border border-hairline bg-surface p-5 shadow-card ${
        completed ? 'opacity-60' : ''
      }`}
    >
      <View className={`mb-1 h-1.5 w-8 rounded-pill ${ACCENT[section].swatch}`} />
      {interestName ? (
        <Text className="font-sans text-caption text-ink-soft">{interestName}</Text>
      ) : null}
      <Text className="font-heading text-heading text-ink">{title}</Text>
      <Text className="font-sans text-secondary text-ink-soft">{goalLine}</Text>
      <View className="flex-row pt-1">
        <View
          className={`flex-row items-center gap-1.5 rounded-pill px-2.5 py-1 ${
            completed ? 'bg-leaf-tint' : ACCENT[section].chip
          }`}
        >
          {completed ? (
            <>
              <Ionicons name="checkmark" size={13} color={colors.leaf.DEFAULT} />
              <Text className="font-sans text-caption text-ink">Done today</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={inProgress ? 'play-circle-outline' : 'time-outline'}
                size={13}
                color={colors.ink.soft}
              />
              <Text className="font-sans text-caption text-ink">
                {inProgress ? 'Continue' : `${estMinutes} min`}
              </Text>
            </>
          )}
        </View>
      </View>
    </PressScale>
  )
}
