import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Watercolor, type BlobColor } from './texture'

/**
 * What a screen says when there is nothing in it yet (docs/07): one plain
 * line over a watercolor wash, and the one action that would fill it. No
 * illustrations of empty boxes, no encouragement.
 */
export function EmptyState({
  message,
  color = 'cornflower',
  children,
}: {
  message: string
  color?: BlobColor
  /** The single action that ends the emptiness, if there is one. */
  children?: ReactNode
}) {
  return (
    <View className="items-center justify-center gap-4 px-8 py-16">
      <Watercolor color={color} size={240} opacity={0.4} />
      <Text className="text-center font-sans text-body text-ink-soft">{message}</Text>
      {children}
    </View>
  )
}
