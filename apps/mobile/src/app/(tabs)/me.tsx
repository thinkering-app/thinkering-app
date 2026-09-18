import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useReducer, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { monthLabel, type LocalDate } from '@thinkering/core'
import { listInterests } from '@thinkering/db'

import { CalendarMonth } from '@/components/calendar-month'
import { FeedbackButton } from '@/components/feedback-button'
import { NavRow } from '@/components/nav-row'
import { db } from '@/db'
import { dayLabel } from '@/history/day-label'
import { DaySheet } from '@/me/day-sheet'
import { useCalendar } from '@/me/use-calendar'
import { useLocalToday } from '@/time'
import { colors } from '@/theme/tokens'

/**
 * Me (docs/01 §7): the interests you manage and a month of what you've done.
 * Settings live behind the ⚙ — five categories, each its own screen — so this
 * tab stays the two things you actually look at.
 */

export default function MeScreen() {
  const today = useLocalToday()
  const { month, marked, changeMonth, dayActivities } = useCalendar(today)
  const [selectedDay, setSelectedDay] = useState<LocalDate | null>(null)
  const [version, reload] = useReducer((n: number) => n + 1, 0)
  // Interests are managed on a pushed screen, and Developer can seed them.
  useFocusEffect(useCallback(() => reload(), []))
  const interestNames = useMemo(
    () => new Map(listInterests(db).map((i) => [i.id, i.name])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
    [version],
  )

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-5 pt-4">
        <Text className="flex-1 font-heading-bold text-display text-ink">Me</Text>
        <Pressable
          testID="me-settings"
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/me/settings')}
          hitSlop={10}
        >
          <Ionicons name="settings-outline" size={22} color={colors.ink.soft} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 py-6">
        <NavRow label="Interests" onPress={() => router.push('/me/interests')} />

        <CalendarMonth
          month={month}
          label={monthLabel(month)}
          marked={marked}
          today={today}
          selected={selectedDay}
          onSelect={setSelectedDay}
          onMonthChange={changeMonth}
        />
      </ScrollView>

      <DaySheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? dayLabel(selectedDay, today) : ''}
        rows={selectedDay ? dayActivities(selectedDay) : []}
        interestNames={interestNames}
      />
      <FeedbackButton />
    </SafeAreaView>
  )
}
