import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FeedbackButton } from './feedback-button'

type ScreenProps = {
  title?: string
  children?: ReactNode
  /** Hide the feedback button on screens where it would overlap (e.g. activity player). */
  feedback?: boolean
}

/** Safe area + paper background + feedback button slot (docs/07). */
export function Screen({ title, children, feedback = true }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-5 pt-4">
        {title ? <Text className="font-heading-bold text-display text-ink">{title}</Text> : null}
        <View className="mt-5 flex-1">{children}</View>
      </View>
      {feedback ? <FeedbackButton /> : null}
    </SafeAreaView>
  )
}
