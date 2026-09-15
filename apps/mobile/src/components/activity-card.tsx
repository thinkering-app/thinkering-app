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
}

const EDGE: Record<Section, string> = {
  next: 'border-l-cornflower',
  strengthen: 'border-l-leaf',
  go_further: 'border-l-peach',
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
}: ActivityCardProps) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${goalLine}. ${estMinutes} minutes`}
      onPress={onPress}
      className={`w-72 gap-2 rounded-card border-l-4 bg-surface p-5 shadow-card ${EDGE[section]} ${
        completed ? 'opacity-60' : ''
      }`}
    >
      {interestName ? (
        <Text className="font-sans text-caption text-ink-soft">{interestName}</Text>
      ) : null}
      <Text className="font-heading text-heading text-ink">{title}</Text>
      <Text className="font-sans text-secondary text-ink-soft">{goalLine}</Text>
      <View className="flex-row items-center gap-1.5 pt-1">
        {completed ? (
          <>
            <Ionicons name="checkmark" size={14} color={colors.leaf.DEFAULT} />
            <Text className="font-sans text-caption text-ink-soft">Done today</Text>
          </>
        ) : (
          <>
            <Ionicons
              name={inProgress ? 'play-circle-outline' : 'time-outline'}
              size={14}
              color={colors.ink.soft}
            />
            <Text className="font-sans text-caption text-ink-soft">
              {inProgress ? 'Continue' : `${estMinutes} min`}
            </Text>
          </>
        )}
      </View>
    </PressScale>
  )
}
