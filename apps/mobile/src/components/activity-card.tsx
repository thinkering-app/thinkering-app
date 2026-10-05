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
  /** Its document is still being written; opening it joins the stream. */
  writing?: boolean
  /** Suggested but not written yet: tapping writes it (Explore → All, or a write that failed). */
  unwritten?: boolean
  /** For Explore → All, where cards from several interests share a section. */
  interestName?: string
  onPress?: () => void
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}

// The landing page's card language: a small accent swatch on white carries the
// section colour, and the meta chip picks up its tint (docs/07 §Sections). Done
// today, the card takes that tint and the chip turns sun.
const ACCENT: Record<Section, { swatch: string; tint: string }> = {
  next: { swatch: 'bg-cornflower', tint: 'bg-cornflower-tint' },
  strengthen: { swatch: 'bg-leaf', tint: 'bg-leaf-tint' },
  go_further: { swatch: 'bg-peach', tint: 'bg-peach-tint' },
}

/** A Today card (docs/01 §3): what it is, the goal it moves, how long it takes. */
export function ActivityCard({
  title,
  goalLine,
  estMinutes,
  section,
  completed = false,
  inProgress = false,
  writing = false,
  unwritten = false,
  interestName,
  onPress,
  testID,
}: ActivityCardProps) {
  return (
    <PressScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${goalLine}. ${
        completed
          ? 'Done today'
          : inProgress
            ? 'Continue'
            : writing
              ? 'Preparing'
              : unwritten
                ? 'Prepare'
                : `${estMinutes} minutes`
      }`}
      onPress={onPress}
      wrapperClassName="w-72"
      className={`gap-2 rounded-card border p-5 ${
        completed
          ? `border-transparent ${ACCENT[section].tint}`
          : 'border-hairline bg-surface shadow-card'
      }`}
    >
      <View className={`mb-1 h-1.5 w-8 rounded-pill ${ACCENT[section].swatch}`} />
      {interestName ? (
        <Text className="font-sans text-caption text-ink-soft">{interestName}</Text>
      ) : null}
      <Text className="font-heading text-heading text-ink">{title}</Text>
      <Text className="font-sans text-secondary text-ink-soft">{goalLine}</Text>
      <View className="mt-auto flex-row pt-1">
        <View
          className={`flex-row items-center gap-1.5 rounded-pill px-2.5 py-1 ${
            completed ? 'bg-sun' : ACCENT[section].tint
          }`}
        >
          {completed ? (
            <>
              <Ionicons name="checkmark" size={13} color={colors.ink.DEFAULT} />
              <Text className="font-sans-medium text-caption text-ink">Done today</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={
                  inProgress
                    ? 'play-circle-outline'
                    : writing
                      ? 'hourglass-outline'
                      : unwritten
                        ? 'create-outline'
                        : 'time-outline'
                }
                size={13}
                color={colors.ink.soft}
              />
              <Text className="font-sans text-caption text-ink">
                {inProgress
                  ? 'Continue'
                  : writing
                    ? 'Preparing'
                    : unwritten
                      ? 'Prepare'
                      : `${estMinutes} min`}
              </Text>
            </>
          )}
        </View>
      </View>
    </PressScale>
  )
}
