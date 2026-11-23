import { isOverLimit } from '@thinkering/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'

import { Button } from '@/components/button'
import { Generating } from '@/components/generating'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'

/**
 * Ask (docs/05): a question at any point in an activity. The answer arrives as
 * a page inserted right after the one they asked from, so the sheet's only job
 * is to take the question and get out of the way.
 */
export function AskSheet({
  visible,
  onClose,
  onAsk,
  state,
  error,
}: {
  visible: boolean
  onClose: () => void
  onAsk: (question: string) => void
  state: 'idle' | 'pending' | 'error'
  error?: string
}) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')

  const close = () => {
    setQuestion('')
    onClose()
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={t('player.ask.label')}
      footer={
        <Button
          testID="ask-submit"
          label={t('player.ask.label')}
          disabled={
            question.trim().length === 0 || isOverLimit(question, 'note') || state === 'pending'
          }
          onPress={() => onAsk(question.trim())}
        />
      }
    >
      {state === 'pending' ? (
        <Generating label={t('player.ask.working')} />
      ) : (
        <>
          <TextField
            value={question}
            onChangeText={setQuestion}
            placeholder={t('player.ask.placeholder')}
            accessibilityLabel={t('player.ask.questionLabel')}
            autoFocus
            multiline
            limit="note"
          />
          {state === 'error' && error ? (
            <Text className="font-sans text-secondary text-ink-soft">{error}</Text>
          ) : null}
        </>
      )}
    </Sheet>
  )
}
