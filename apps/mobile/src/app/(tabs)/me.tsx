import Ionicons from '@expo/vector-icons/Ionicons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useMemo, useReducer, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { monthLabel, type LocalDate } from '@thinkering/core'
import { listInterests, seedFixtureData } from '@thinkering/db'

import { Button } from '@/components/button'
import { CalendarMonth } from '@/components/calendar-month'
import { FeedbackButton } from '@/components/feedback-button'
import { Pill } from '@/components/pill'
import { db, repoContext } from '@/db'
import { FeedbackFlow } from '@/feedback/flow'
import { dayLabel } from '@/history/day-label'
import { DaySheet } from '@/me/day-sheet'
import { useCalendar } from '@/me/use-calendar'
import { useLocalToday } from '@/time'
import { colors } from '@/theme/tokens'
import {
  getAiMode,
  isInspectorEnabled,
  setAiMode,
  setInspectorEnabled,
  type AiMode,
} from '@/ai/settings'

/**
 * Me (docs/01 §7): the interests you manage, a month of what you've done, and
 * the settings. Everything here is either a list or a link — the work happens
 * on the screens it opens.
 */

const MODES: AiMode[] = ['proxy', 'byok', 'fixture']

export default function MeScreen() {
  const today = useLocalToday()
  const { month, marked, changeMonth, dayActivities } = useCalendar(today)
  const [selectedDay, setSelectedDay] = useState<LocalDate | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [version, reload] = useReducer((n: number) => n + 1, 0)
  const [mode, setMode] = useState<AiMode>(() => getAiMode())
  const [inspector, setInspector] = useState(() => isInspectorEnabled())
  const interestNames = useMemo(
    () => new Map(listInterests(db).map((i) => [i.id, i.name])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
    [version],
  )

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-4">
        <Text className="font-heading-bold text-display text-ink">Me</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 py-6">
        <Row label="Interests" onPress={() => router.push('/me/interests')} />

        <CalendarMonth
          month={month}
          label={monthLabel(month)}
          marked={marked}
          today={today}
          selected={selectedDay}
          onSelect={setSelectedDay}
          onMonthChange={changeMonth}
        />

        <View className="gap-2">
          <Text className="font-heading-bold text-heading text-ink">Settings</Text>
          <Row testID="me-backup" label="Backup" onPress={() => router.push('/me/backup')} />
          <Row label="AI usage" onPress={() => router.push('/me/ai-usage')} />
          <Row label="Privacy" onPress={() => router.push('/me/privacy')} />
          <Row label="Feedback" onPress={() => setFeedbackOpen(true)} />
        </View>

        {__DEV__ ? (
          <View className="gap-3">
            <Text className="font-sans text-secondary text-ink-soft">AI mode</Text>
            <View className="flex-row gap-2">
              {MODES.map((m) => (
                <Pill
                  key={m}
                  label={m}
                  selected={mode === m}
                  onPress={() => {
                    setAiMode(m)
                    setMode(m)
                  }}
                />
              ))}
            </View>
            <Button
              label="Load fixture data"
              variant="quiet"
              onPress={() => {
                seedFixtureData(db, repoContext, { today })
                reload()
              }}
            />
          </View>
        ) : null}

        {inspector ? (
          <Button
            label="AI Inspector"
            variant="quiet"
            onPress={() => router.push('/ai-inspector')}
          />
        ) : null}

        {/* Hidden toggle (docs/02): long-press the version line to reveal the Inspector in production builds. */}
        <Pressable
          onLongPress={() => {
            const next = !isInspectorEnabled()
            setInspectorEnabled(next)
            setInspector(__DEV__ || next)
          }}
          delayLongPress={1500}
          className="items-center py-2"
        >
          <Text className="font-sans text-caption text-ink-soft">
            thinkering {Constants.expoConfig?.version ?? '0.0.0'}
          </Text>
        </Pressable>
      </ScrollView>

      <DaySheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? dayLabel(selectedDay, today) : ''}
        rows={selectedDay ? dayActivities(selectedDay) : []}
        interestNames={interestNames}
      />
      <FeedbackFlow visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <FeedbackButton />
    </SafeAreaView>
  )
}

function Row({
  label,
  onPress,
  testID,
}: {
  label: string
  onPress: () => void
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}) {
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
