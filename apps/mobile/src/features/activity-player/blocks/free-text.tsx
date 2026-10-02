import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ResponsePayloadFor } from '@thinkering/core'

import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'
import { useAsk } from '../ask'
import { Markdown } from '../markdown'
import { useResponse } from '../responses'
import type { BlockOf } from './types'

/** Reflection / explain-back (docs/05). Saves as they type — there is no submit. */
export function FreeTextBlock({ pageId, block }: { pageId: string; block: BlockOf<'freeText'> }) {
  const [answer, respond] = useResponse<ResponsePayloadFor<'freeText'>>(pageId, block.id)
  const ask = useAsk()
  const [considering, setConsidering] = useState(false)
  // Blank counts as none: older documents and G7 pages have no consider, and a
  // pill that opens an empty card is worse than no pill.
  const consider = block.consider?.trim()
  const offerConsider = Boolean(consider) && !considering

  return (
    <View className="gap-3">
      <Markdown md={block.prompt} className="font-sans-medium text-body text-ink" />
      <TextField
        value={answer?.text ?? ''}
        onChangeText={(text) => respond({ kind: 'freeText', text })}
        placeholder={block.placeholder}
        accessibilityLabel={block.prompt}
        multiline={block.minimal !== true}
        limit="long"
      />
      {considering && consider ? (
        <View className="flex-row gap-2.5 rounded-card bg-sun-tint p-4">
          <Ionicons name="bulb-outline" size={18} color={colors.ink.DEFAULT} />
          <View className="flex-1">
            <Markdown md={consider} />
          </View>
        </View>
      ) : null}
      {/* Stuck on an answer is when a question comes up, so Ask is offered here
          as well as in the navigation row (docs/05). */}
      {offerConsider || ask ? (
        <View className="flex-row flex-wrap gap-2">
          {offerConsider ? (
            <ActionPill
              icon="bulb-outline"
              label="Think about…"
              tone="sun"
              onPress={() => setConsidering(true)}
            />
          ) : null}
          {ask ? (
            <ActionPill
              icon="chatbubble-outline"
              label="Ask a question"
              tone="cornflower"
              onPress={ask}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function ActionPill({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tone: 'sun' | 'cornflower'
  onPress: () => void
}) {
  const sun = tone === 'sun'
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-pill px-3.5 py-2 active:opacity-70 ${
        sun ? 'bg-sun-tint' : 'bg-cornflower-tint'
      }`}
    >
      <Ionicons name={icon} size={16} color={sun ? colors.ink.DEFAULT : colors.cornflower.deep} />
      <Text
        className={`font-sans-medium text-secondary ${sun ? 'text-ink' : 'text-cornflower-deep'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
