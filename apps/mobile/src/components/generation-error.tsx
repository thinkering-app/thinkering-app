import { Text, View } from 'react-native'

import { Button } from '@/components/button'

/** The "couldn't generate, try again" state (docs/04 §Failure handling). Calm, one line, one action. */
export function GenerationError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center gap-4 py-10">
      <Text className="text-center font-sans text-body text-ink-soft">{message}</Text>
      <Button label="Try again" variant="quiet" onPress={onRetry} />
    </View>
  )
}
