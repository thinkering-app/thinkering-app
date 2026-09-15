import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, View } from 'react-native'
import { gradeMcq, type ResponsePayloadFor } from '@thinkering/core'

import { colors } from '@/theme/tokens'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Multiple choice (docs/05): instant feedback when the block carries a
 * `correctId`, opinion-style when it doesn't. Answering records immediately.
 */
export function McqBlock({ pageId, block }: { pageId: string; block: BlockOf<'mcq'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'mcq'>>(pageId, block.id)
  const graded = block.correctId !== undefined

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <View className="gap-2">
        {block.options.map((option) => {
          const chosen = answer?.selectedId === option.id
          const reveal = graded && answer !== undefined
          const isCorrect = option.id === block.correctId
          const tone = !reveal
            ? chosen
              ? 'border-cornflower-deep bg-cornflower-tint'
              : 'border-hairline bg-surface'
            : isCorrect
              ? 'border-leaf bg-leaf-tint'
              : chosen
                ? 'border-peach bg-peach-tint'
                : 'border-hairline bg-surface'
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              onPress={() =>
                respond({ kind: 'mcq', selectedId: option.id, correct: gradeMcq(block, option.id) })
              }
              className={`flex-row items-center gap-3 rounded-card border p-4 ${tone}`}
            >
              <Markdown md={option.label} className="flex-1 font-sans text-body text-ink" />
              {reveal && (isCorrect || chosen) ? (
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={isCorrect ? colors.leaf.DEFAULT : colors.peach.DEFAULT}
                />
              ) : null}
            </Pressable>
          )
        })}
      </View>
      {answer && block.explain ? (
        <Markdown md={block.explain} className="font-sans text-secondary text-ink-soft" />
      ) : null}
    </View>
  )
}
