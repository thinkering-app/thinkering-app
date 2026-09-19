import { Fragment, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { gradeBlank, gradeFillBlank, type ResponsePayloadFor } from '@thinkering/core'

import { colors } from '@/theme/tokens'
import { MarkdownWords } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/**
 * Faded examples and cloze practice (docs/05). `___` in the block's markdown
 * marks where each blank goes, in order; anything else renders as text.
 */
export function FillBlankBlock({ pageId, block }: { pageId: string; block: BlockOf<'fillBlank'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'fillBlank'>>(pageId, block.id)
  const answers = answer?.answers ?? {}
  // A blank is graded once the learner leaves it, so typing "1" on the way to
  // "100" doesn't flag it or give the answer away. Restored answers count as left.
  const [left, setLeft] = useState<ReadonlySet<string>>(
    () => new Set(Object.keys(answers).filter((id) => (answers[id] ?? '').length > 0)),
  )

  const setBlank = (blankId: string, text: string) => {
    const next = { ...answers, [blankId]: text }
    respond({ kind: 'fillBlank', answers: next, correct: gradeFillBlank(block, next) })
  }

  const verdict = (blankId: string): boolean | undefined => {
    const blank = block.blanks.find((b) => b.id === blankId)
    const text = answers[blankId] ?? ''
    if (!blank || !left.has(blankId) || text.length === 0) return undefined
    return gradeBlank(blank, text)
  }

  const segments = block.md.split('___')
  const missed = block.blanks.filter((b) => verdict(b.id) === false)

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-y-2">
        {segments.map((segment, i) => {
          const blank = block.blanks[i]
          return (
            <Fragment key={i}>
              <MarkdownWords md={segment} />
              {blank ? (
                <BlankInput
                  label={`Blank ${i + 1}`}
                  value={answers[blank.id] ?? ''}
                  correct={verdict(blank.id)}
                  onChangeText={(text) => setBlank(blank.id, text)}
                  onBlur={() => setLeft((prev) => new Set(prev).add(blank.id))}
                />
              ) : null}
            </Fragment>
          )
        })}
      </View>
      {missed.length > 0 ? (
        <Text className="font-sans text-secondary text-ink-soft">
          {missed.length === 1 ? 'Answer' : 'Answers'}: {missed.map((b) => b.answer).join(' · ')}
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
  onBlur,
}: {
  label: string
  value: string
  correct?: boolean
  onChangeText: (text: string) => void
  onBlur: () => void
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
      onBlur={onBlur}
      autoCapitalize="none"
      autoCorrect={false}
      selectionColor={colors.cornflower.DEFAULT}
      className={`mx-1 w-32 rounded-lg border-b-2 px-2 py-1 font-sans-medium text-body text-ink ${tone}`}
    />
  )
}
