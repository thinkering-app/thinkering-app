import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { displayOrder, gradeOrdering, type ResponsePayloadFor } from '@thinkering/core'

import { Button } from '@/components/button'
import { colors } from '@/theme/tokens'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Put these in order (docs/05). Move-up/move-down rather than drag: it works
 * inside a scrolling page, and it's reachable with a screen reader. The items
 * start shuffled, and the order is only saved and graded on Check: until the
 * learner says they're done, a half-made order isn't wrong. Moving an item
 * after a check takes the verdict away until they check again.
 */
export function OrderingBlock({ pageId, block }: { pageId: string; block: BlockOf<'ordering'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'ordering'>>(pageId, block.id)
  const [order, setOrder] = useState<string[]>(
    () =>
      answer?.order ??
      displayOrder(
        block.items.map((i) => i.id),
        `${pageId}:${block.id}`,
        block.correctOrder,
      ),
  )
  const [checked, setChecked] = useState(answer !== undefined)

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setOrder(next)
    setChecked(false)
  }

  const check = () => {
    respond({ kind: 'ordering', order, correct: gradeOrdering(block, order) })
    setChecked(true)
  }

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <View className="gap-2">
        {order.map((id, index) => {
          const item = block.items.find((i) => i.id === id)
          const inPlace = checked && block.correctOrder[index] === id
          return (
            <View
              key={id}
              className={`flex-row items-center gap-2 rounded-card border p-3 ${
                checked
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
      {checked ? null : <Button label="Check" variant="quiet" onPress={check} />}
    </View>
  )
}
