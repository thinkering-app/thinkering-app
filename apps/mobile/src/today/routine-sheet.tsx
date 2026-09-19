import { Linking, Text, View } from 'react-native'
import type { Section } from '@thinkering/core'

import { SECTION_LABELS } from '@/components/section-header'
import { Sheet } from '@/components/sheet'

/**
 * "Configure learning routine" (docs/01 §3): the suggested daily rhythm,
 * read-only for now, with a link to the feedback board post where people can
 * ask for a routine of their own.
 */

const ROUTINE_FEEDBACK_URL = 'https://thinkering.featurebase.app/p/customize-learning-routine'

const ROUTINE: { section: Section; what: string; cadence: string }[] = [
  { section: 'next', what: 'Learn something new', cadence: '1 a day' },
  { section: 'strengthen', what: 'Review and deepen what you’ve learned', cadence: '1 a day' },
  {
    section: 'go_further',
    what: 'Put your learning to use, or take it further',
    cadence: 'Optional',
  },
]

export function RoutineSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Learning routine">
      <View className="gap-4">
        {ROUTINE.map(({ section, what, cadence }) => (
          <View key={section} className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-medium text-body text-ink">{SECTION_LABELS[section]}</Text>
              <Text className="font-sans text-secondary text-ink-soft">{what}</Text>
            </View>
            <Text className="font-sans text-secondary text-ink-soft">{cadence}</Text>
          </View>
        ))}
      </View>
      <Text className="font-sans text-secondary leading-relaxed text-ink-soft">
        This is the suggested routine for now. If you’d like to shape your own, upvote or comment on{' '}
        <Text
          className="text-cornflower-deep"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(ROUTINE_FEEDBACK_URL)}
        >
          the feedback board
        </Text>
        .
      </Text>
    </Sheet>
  )
}
