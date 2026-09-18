import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Wash, type WashColor } from './texture'

/**
 * What a screen says when there is nothing in it yet (docs/07): one plain
 * line, a wash at either edge, and the one action that would fill it. No
 * illustrations of empty boxes, no encouragement.
 */
export function EmptyState({
  message,
  color = 'cornflower',
  children,
}: {
  message: string
  color?: WashColor
  /** The single action that ends the emptiness, if there is one. */
  children?: ReactNode
}) {
  return (
    <View className="items-center justify-center gap-4 px-8 py-16">
      {/* Bleed sideways only: the list above clips, and a cut wash has an edge. */}
      <Wash color={color} size={240} className="-left-28 top-0" />
      <Wash color="sun" size={200} className="-right-24 top-16" />
      <Text className="text-center font-sans text-body text-ink-soft">{message}</Text>
      {children}
    </View>
  )
}
