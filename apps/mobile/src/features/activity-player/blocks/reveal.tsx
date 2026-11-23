import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { ResponsePayloadFor } from '@thinkering/core'

import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

const CARD = 'min-h-48 rounded-card p-5 shadow-card'

/**
 * Think, then tap to reveal (docs/05) — retrieval practice, so the tap is the
 * point. A flashcard: the prompt on the front, the answer on the back, and a
 * line asking for an answer in their head before they turn it.
 */
export function RevealBlock({ pageId, block }: { pageId: string; block: BlockOf<'reveal'> }) {
  const { t } = useTranslation()
  const [answer, respond] = useResponse<ResponsePayloadFor<'reveal'>>(pageId, block.id)
  const revealed = answer?.revealed === true

  if (revealed) {
    return (
      <View className={`${CARD} gap-3 bg-cornflower-tint`}>
        <Markdown md={block.prompt} className="font-sans text-secondary text-ink-soft" />
        <View className="flex-1 justify-center">
          <Markdown md={block.md} className="font-sans text-body text-ink" />
        </View>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('player.reveal.accessibilityHint')}
      onPress={() => respond({ kind: 'reveal', revealed: true })}
      className={`${CARD} justify-between gap-4 bg-surface active:bg-cornflower-tint`}
    >
      <View className="flex-1 justify-center">
        <Markdown
          md={block.prompt}
          className="text-center font-sans-medium text-heading text-ink"
        />
      </View>
      <Text className="text-center font-sans text-secondary text-ink-soft">
        {t('player.reveal.hint')}
      </Text>
    </Pressable>
  )
}
