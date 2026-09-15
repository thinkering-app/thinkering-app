import { Text, TextInput, View } from 'react-native'
import { gradeBlank, gradeFillBlank, type ResponsePayloadFor } from '@thinkering/core'

import { colors } from '@/theme/tokens'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Faded examples and cloze practice (docs/05). `___` in the block's markdown
 * marks where each blank goes, in order; anything else renders as text.
 */
export function FillBlankBlock({ pageId, block }: { pageId: string; block: BlockOf<'fillBlank'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'fillBlank'>>(pageId, block.id)
  const answers = answer?.answers ?? {}

  const setBlank = (blankId: string, text: string) => {
    const next = { ...answers, [blankId]: text }
    respond({ kind: 'fillBlank', answers: next, correct: gradeFillBlank(block, next) })
  }

  const segments = block.md.split('___')

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-y-2">
        {segments.map((segment, i) => {
          const blank = block.blanks[i]
          return (
            <View key={i} className="flex-row items-center">
              {segment.length > 0 ? <Markdown md={segment} /> : null}
              {blank ? (
                <BlankInput
                  label={`Blank ${i + 1}`}
                  value={answers[blank.id] ?? ''}
                  correct={
                    (answers[blank.id] ?? '').length > 0
                      ? gradeBlank(blank, answers[blank.id] ?? '')
                      : undefined
                  }
                  onChangeText={(text) => setBlank(blank.id, text)}
                />
              ) : null}
            </View>
          )
        })}
      </View>
      {answer && !answer.correct ? (
        <Text className="font-sans text-secondary text-ink-soft">
          {block.blanks.map((b) => b.answer).join(' · ')}
        </Text>
      ) : null}
    </View>
  )
}

function BlankInput({
  label,
  value,
  correct,
  onChangeText,
}: {
  label: string
  value: string
  correct?: boolean
  onChangeText: (text: string) => void
}) {
  const tone =
    correct === undefined
      ? 'border-hairline'
      : correct
        ? 'border-leaf bg-leaf-tint'
        : 'border-peach'
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      selectionColor={colors.cornflower.DEFAULT}
      className={`mx-1 min-w-24 rounded-lg border-b-2 px-2 py-1 font-sans-medium text-body text-ink ${tone}`}
    />
  )
}
