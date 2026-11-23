import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { HistoryRow } from '@thinkering/db'

import { outcomeText } from '@/history/outcome'

/**
 * A day on the calendar (docs/01 §7): that day's activities in the order they
 * were finished, grouped by interest, listed under the calendar itself.
 */
export function DayActivities({
  title,
  rows,
  interestNames,
}: {
  title: string
  rows: HistoryRow[]
  interestNames: Map<string, string>
}) {
  const { t } = useTranslation()
  const groups: { interestId: string; rows: HistoryRow[] }[] = []
  for (const row of rows) {
    const group = groups.find((g) => g.interestId === row.interestId)
    if (group) group.rows.push(row)
    else groups.push({ interestId: row.interestId, rows: [row] })
  }

  return (
    <View className="gap-3">
      <Text className="font-heading-bold text-heading text-ink">{title}</Text>
      {groups.map((group) => (
        <View key={group.interestId} className="gap-2">
          <Text className="font-sans text-caption text-ink-soft">
            {interestNames.get(group.interestId) ?? t('me.dayActivities.interestFallback')}
          </Text>
          {group.rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.title}. ${outcomeText(row)}`}
              onPress={() => router.push(`/activity/${row.id}`)}
              className="gap-1 rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
            >
              <Text className="font-heading text-body text-ink">{row.title}</Text>
              <Text className="font-sans text-secondary text-ink-soft">{outcomeText(row)}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  )
}
