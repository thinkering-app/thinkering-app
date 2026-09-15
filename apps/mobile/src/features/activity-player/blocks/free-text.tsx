import { View } from 'react-native'
import type { ResponsePayloadFor } from '@thinkering/core'

import { TextField } from '@/components/text-field'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/** Reflection / explain-back (docs/05). Saves as they type — there is no submit. */
export function FreeTextBlock({ pageId, block }: { pageId: string; block: BlockOf<'freeText'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'freeText'>>(pageId, block.id)
  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <TextField
        value={answer?.text ?? ''}
        onChangeText={(text) => respond({ kind: 'freeText', text })}
        placeholder={block.placeholder}
        accessibilityLabel={block.prompt}
        multiline={block.minimal !== true}
      />
    </View>
  )
}
