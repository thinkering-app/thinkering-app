import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text, View } from 'react-native'
import { gradeOrdering, type ResponsePayloadFor } from '@thinkering/core'

import { colors } from '@/theme/tokens'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Put these in order (docs/05). Move-up/move-down rather than drag: it works
 * inside a scrolling page, and it's reachable with a screen reader.
 */
export function OrderingBlock({ pageId, block }: { pageId: string; block: BlockOf<'ordering'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'ordering'>>(pageId, block.id)
  const order = answer?.order ?? block.items.map((i) => i.id)
  const settled = answer !== undefined

  const move = (index: number, delta: number) => {
    const next = [...order]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    respond({ kind: 'ordering', order: next, correct: gradeOrdering(block, next) })
  }

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <View className="gap-2">
        {order.map((id, index) => {
          const item = block.items.find((i) => i.id === id)
          const inPlace = settled && block.correctOrder[index] === id
          return (
            <View
              key={id}
              className={`flex-row items-center gap-2 rounded-card border p-3 ${
                settled
                  ? inPlace
                    ? 'border-leaf bg-leaf-tint'
                    : 'border-peach bg-peach-tint'
                  : 'border-hairline bg-surface'
              }`}
            >
              <Text className="w-5 font-sans-medium text-secondary text-ink-soft">{index + 1}</Text>
              <Markdown md={item?.label ?? id} className="flex-1 font-sans text-body text-ink" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Move ${item?.label ?? id} up`}
                onPress={() => move(index, -1)}
                hitSlop={8}
              >
                <Ionicons name="chevron-up" size={18} color={colors.ink.soft} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Move ${item?.label ?? id} down`}
                onPress={() => move(index, 1)}
                hitSlop={8}
              >
                <Ionicons name="chevron-down" size={18} color={colors.ink.soft} />
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}
