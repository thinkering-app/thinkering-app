import { router } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, SectionList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { outcomeLine } from '@thinkering/core'
import type { HistoryRow } from '@thinkering/db'

import { EmptyState } from '@/components/empty-state'
import { FeedbackButton } from '@/components/feedback-button'
import { dayLabel } from '@/history/day-label'
import { useHistory } from '@/history/use-history'
import { useInterestSelection } from '@/interests/selection'
import { InterestSelector } from '@/interests/selector'
import { useLocalToday } from '@/time'

/**
 * History (docs/01 §6): everything completed in the selected interests, newest
 * day first, each row saying what it did for a goal. Tapping one reopens it.
 */
export default function HistoryScreen() {
  const { selected, focus, exploring } = useInterestSelection()
  const interestIds = useMemo(
    () => (focus.length + exploring.length === 0 ? undefined : selected.map((i) => i.id)),
    [exploring.length, focus.length, selected],
  )
  const { days, hasMore, loadMore } = useHistory(interestIds)
  const today = useLocalToday()
  // Explore → All mixes interests, so each row says which one it belongs to.
  const interestNames = useMemo(
    () => (selected.length > 1 ? new Map(selected.map((i) => [i.id, i.name])) : null),
    [selected],
  )

  const sections = useMemo(
    () => days.map((day) => ({ title: dayLabel(day.date, today), data: day.items })),
    [days, today],
  )

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="gap-4 px-5 pt-4">
        <Text className="font-heading-bold text-display text-ink">History</Text>
        <InterestSelector />
      </View>

      <SectionList
        className="flex-1"
        contentContainerClassName="py-6"
        sections={sections}
        keyExtractor={(row) => row.id}
        stickySectionHeadersEnabled={false}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        renderSectionHeader={({ section }) => (
          <Text className="px-5 pb-3 pt-4 font-heading-bold text-heading text-ink">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <HistoryEntry row={item} interestName={interestNames?.get(item.interestId)} />
        )}
        ListEmptyComponent={<Empty />}
      />
      <FeedbackButton />
    </SafeAreaView>
  )
}

function HistoryEntry({ row, interestName }: { row: HistoryRow; interestName?: string }) {
  return (
    <View className="px-5 pb-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.title}. ${outcomeLine(row)}`}
        onPress={() => router.push(`/activity/${row.id}`)}
        className="gap-1 rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
      >
        {interestName ? (
          <Text className="font-sans text-caption text-ink-soft">{interestName}</Text>
        ) : null}
        <Text className="font-heading text-body text-ink">{row.title}</Text>
        <Text className="font-sans text-secondary text-ink-soft">{outcomeLine(row)}</Text>
      </Pressable>
    </View>
  )
}

function Empty() {
  return (
    <View className="px-5">
      <EmptyState message="Activities you finish show up here." color="leaf" />
    </View>
  )
}
