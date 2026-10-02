import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { ResponsePayloadFor } from '@thinkering/core'

import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/** Think, then tap to reveal (docs/05) — retrieval practice, so the tap is the point. */
export function RevealBlock({ pageId, block }: { pageId: string; block: BlockOf<'reveal'> }) {
  const { t } = useTranslation()
  const [answer, respond] = useResponse<ResponsePayloadFor<'reveal'>>(pageId, block.id)
  const revealed = answer?.revealed === true

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      {revealed ? (
        <View className="rounded-card bg-cornflower-tint p-4">
          <Markdown md={block.md} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => respond({ kind: 'reveal', revealed: true })}
          className="items-center rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
        >
          <Text className="font-sans-medium text-body text-cornflower-deep">
            {t('player.reveal.show')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
