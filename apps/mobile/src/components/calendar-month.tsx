import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text, View } from 'react-native'
import { monthGrid, WEEKDAY_LABELS, type LocalDate, type YearMonth } from '@thinkering/core'

import { colors } from '@/theme/tokens'

type CalendarMonthProps = {
  month: YearMonth
  label: string
  /** Local dates with at least one completed activity — the marked days (docs/01 §7). */
  marked: Set<LocalDate>
  /** Weeks in a row with any activity; shown from two (docs/01 §7). */
  streak: number
  today: LocalDate
  selected: LocalDate | null
  onSelect: (date: LocalDate) => void
  onMonthChange: (delta: number) => void
}

/**
 * The Me calendar (docs/07): a month of days, the ones you did something on
 * marked in sun, and the weeks in a row you've done something under the month.
 */
export function CalendarMonth({
  month,
  label,
  marked,
  streak,
  today,
  selected,
  onSelect,
  onMonthChange,
}: CalendarMonthProps) {
  return (
    <View className="gap-3 rounded-card bg-surface p-4 shadow-card">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => onMonthChange(-1)}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink.soft} />
        </Pressable>
        <Text className="font-heading-bold text-heading text-ink">{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => onMonthChange(1)}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink.soft} />
        </Pressable>
      </View>
      {streak >= 2 ? (
        <Text className="-mt-2 text-center font-sans text-secondary text-ink-soft">
          {streak} weeks in a row
        </Text>
      ) : null}

      <View className="flex-row">
        {WEEKDAY_LABELS.map((day) => (
          <Text key={day} className="flex-1 text-center font-sans text-caption text-ink-soft">
            {day.slice(0, 1)}
          </Text>
        ))}
      </View>

      {monthGrid(month).map((week) => (
        <View key={week[0]!.date} className="flex-row">
          {week.map((day) => {
            const hasActivity = marked.has(day.date)
            return (
              <View key={day.date} className="flex-1 items-center py-0.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={day.date}
                  accessibilityState={{ selected: selected === day.date }}
                  disabled={!hasActivity}
                  onPress={() => onSelect(day.date)}
                  className={`h-9 w-9 items-center justify-center rounded-pill ${
                    selected === day.date
                      ? 'bg-sun'
                      : hasActivity
                        ? 'bg-sun-tint'
                        : day.date === today
                          ? 'border border-cornflower'
                          : ''
                  }`}
                >
                  <Text
                    className={`font-sans text-secondary ${
                      !day.inMonth ? 'text-hairline' : hasActivity ? 'text-ink' : 'text-ink-soft'
                    }`}
                  >
                    {Number(day.date.slice(8))}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
