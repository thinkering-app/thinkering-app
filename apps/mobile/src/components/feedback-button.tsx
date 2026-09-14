import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable } from 'react-native'

import { colors } from '@/theme/tokens'

/** Global feedback entry point. Stub until the feedback form ships (WP6.2). */
export function FeedbackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Send feedback"
      onPress={() => {}}
      className="absolute bottom-6 right-5 h-11 w-11 items-center justify-center rounded-pill border border-hairline bg-surface shadow-card active:bg-cornflower-tint"
    >
      <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink.soft} />
    </Pressable>
  )
}
