import { Pressable, Text, View } from 'react-native'
import type { ResponsePayloadFor } from '@thinkering/core'

import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/** Confidence / self-assessment (docs/05). No feedback — it's their read, not ours. */
export function SelfRateBlock({ pageId, block }: { pageId: string; block: BlockOf<'selfRate'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'selfRate'>>(pageId, block.id)
  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <View className="flex-row flex-wrap gap-2">
        {block.scale.map((step) => {
          const chosen = answer?.selectedId === step.id
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              onPress={() => respond({ kind: 'selfRate', selectedId: step.id })}
              className={`rounded-pill border px-4 py-2.5 ${
                chosen ? 'border-cornflower-deep bg-cornflower-tint' : 'border-hairline bg-surface'
              }`}
            >
              <Text
                className={
                  chosen
                    ? 'font-sans-medium text-body text-cornflower-deep'
                    : 'font-sans text-body text-ink'
                }
              >
                {step.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
