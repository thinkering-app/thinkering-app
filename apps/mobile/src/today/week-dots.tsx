import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useReducer } from 'react'
import { Pressable, View } from 'react-native'
import {
  localDateOf,
  weekBoundsMs,
  weekRhythm,
  weeklyTarget,
  type LocalDate,
} from '@thinkering/core'
import { listCompletedBetween, type Interest } from '@thinkering/db'

import { db } from '@/db'
import { colors } from '@/theme/tokens'
import { deviceTimeZone } from '@/time'

import { weekCount, weekMessage } from './week-copy'

/**
 * The week's rhythm beside the Today title (docs/01 §3, docs/07): a dot per
 * day of the interest's weekly target — filled for each day practiced, light
 * for the rest. Days past the target add filled dots; with no target only the
 * filled ones show. Dots aren't weekdays, so there's no wrong day to miss.
 * When today is one of the days, the last filled dot carries a check, like a
 * section's. Tapping says what they mean, in a line from `week-copy`.
 */
export function WeekDots({
  interest,
  today,
  onExplain,
}: {
  interest: Interest
  today: LocalDate
  onExplain: (message: string) => void
}) {
  const rhythm = useWeekRhythm(interest, today)
  const { done, doneToday, target } = rhythm
  const count = Math.max(done, target ?? 0)
  if (count === 0) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${weekCount(rhythm)}${doneToday ? ' Learned today.' : ''}`}
      onPress={() => onExplain(weekMessage(rhythm, today))}
      hitSlop={10}
      className="flex-row items-center gap-1"
    >
      {Array.from({ length: count }, (_, i) =>
        doneToday && i === done - 1 ? (
          <View key={i} className="h-3.5 w-3.5 items-center justify-center rounded-pill bg-sun">
            <Ionicons name="checkmark" size={10} color={colors.ink.DEFAULT} />
          </View>
        ) : (
          <View
            key={i}
            className={`h-2 w-2 rounded-pill ${i < done ? 'bg-sun' : 'border border-sun bg-sun-tint'}`}
          />
        ),
      )}
    </Pressable>
  )
}

function useWeekRhythm(interest: Interest, today: LocalDate) {
  const [version, refresh] = useReducer((n: number) => n + 1, 0)
  // Coming back to Today can mean an activity just completed.
  useFocusEffect(useCallback(() => refresh(), []))
  return useMemo(() => {
    const timeZone = deviceTimeZone()
    const dates = listCompletedBetween(db, {
      interestIds: [interest.id],
      ...weekBoundsMs(today),
    }).map((row) => localDateOf(row.completedAt, timeZone))
    return weekRhythm(dates, today, weeklyTarget(interest))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  }, [interest.id, interest.frequency, interest.weeklyDays, today, version])
}
