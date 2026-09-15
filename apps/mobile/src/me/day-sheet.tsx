import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { outcomeLine } from '@thinkering/core'
import type { HistoryRow } from '@thinkering/db'

import { Sheet } from '@/components/sheet'

/**
 * A day on the calendar (docs/01 §7): that day's activities in the order they
 * were finished, grouped by interest.
 */
export function DaySheet({
  visible,
  onClose,
  title,
  rows,
  interestNames,
}: {
  visible: boolean
  onClose: () => void
  title: string
  rows: HistoryRow[]
  interestNames: Map<string, string>
}) {
  const groups: { interestId: string; rows: HistoryRow[] }[] = []
  for (const row of rows) {
    const group = groups.find((g) => g.interestId === row.interestId)
    if (group) group.rows.push(row)
    else groups.push({ interestId: row.interestId, rows: [row] })
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {groups.map((group) => (
        <View key={group.interestId} className="gap-2 pb-2">
          <Text className="font-sans text-caption text-ink-soft">
            {interestNames.get(group.interestId) ?? 'Interest'}
          </Text>
          {group.rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() => {
                onClose()
                router.push(`/activity/${row.id}`)
              }}
              className="gap-1 rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
            >
              <Text className="font-heading text-body text-ink">{row.title}</Text>
              <Text className="font-sans text-secondary text-ink-soft">{outcomeLine(row)}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Sheet>
  )
}
