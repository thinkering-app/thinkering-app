import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { displayOrder, gradeMatching, type ResponsePayloadFor } from '@thinkering/core'

import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Pair the left column with the right (docs/05). Tap a left item, then its
 * match — no dragging, so it works on a scrolling page.
 */
export function MatchingBlock({ pageId, block }: { pageId: string; block: BlockOf<'matching'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'matching'>>(pageId, block.id)
  const pairs = answer?.pairs ?? {}
  // The left item waiting for its match; pairing advances to the next unpaired one.
  const [active, setActive] = useState<string | null>(() => block.pairs[0]?.leftId ?? null)

  // Shuffled: the model writes each right beside its own left.
  const [rights] = useState(() => {
    const inStep = block.pairs.map((p) => p.rightId)
    return displayOrder(inStep, `${pageId}:${block.id}`, inStep).map((id) =>
      block.pairs.find((p) => p.rightId === id)!,
    )
  })

  const choose = (rightId: string) => {
    if (!active) return
    const next = { ...pairs, [active]: rightId }
    setActive(block.pairs.find((p) => next[p.leftId] === undefined)?.leftId ?? null)
    respond({ kind: 'matching', pairs: next, correct: gradeMatching(block, next) })
  }

  const done = Object.keys(pairs).length === block.pairs.length

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          {block.pairs.map((pair) => {
            const matched = pairs[pair.leftId]
            const right = rights.find((r) => r.rightId === matched)
            const correct = done ? matched === pair.rightId : undefined
            return (
              <Pressable
                key={pair.leftId}
                accessibilityRole="button"
                accessibilityLabel={pair.left}
                accessibilityState={{ selected: active === pair.leftId }}
                onPress={() => setActive(pair.leftId)}
                className={`gap-1 rounded-card border p-3 ${
                  active === pair.leftId
                    ? 'border-cornflower-deep bg-cornflower-tint'
                    : correct === undefined
                      ? 'border-hairline bg-surface'
                      : correct
                        ? 'border-leaf bg-leaf-tint'
                        : 'border-peach bg-peach-tint'
                }`}
              >
                <Markdown md={pair.left} className="font-sans text-body text-ink" />
                {right ? (
                  <Text className="font-sans text-caption text-ink-soft" numberOfLines={1}>
                    {right.right}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
        <View className="flex-1 gap-2">
          {rights.map((pair) => (
            <Pressable
              key={pair.rightId}
              accessibilityRole="button"
              accessibilityLabel={pair.right}
              disabled={active === null}
              onPress={() => choose(pair.rightId)}
              className={`rounded-card border p-3 ${
                active === null
                  ? 'border-hairline bg-surface opacity-60'
                  : 'border-cornflower bg-surface'
              }`}
            >
              <Markdown md={pair.right} className="font-sans text-body text-ink" />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}
