import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable } from 'react-native'

import { FeedbackFlow } from '@/feedback/flow'
import { colors } from '@/theme/tokens'

/** Global feedback entry point (docs/01 §2): opens the community/private chooser. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
        onPress={() => setOpen(true)}
        className="absolute bottom-6 right-5 h-11 w-11 items-center justify-center rounded-pill border border-hairline bg-surface shadow-card active:bg-cornflower-tint"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink.soft} />
      </Pressable>
      <FeedbackFlow visible={open} onClose={() => setOpen(false)} />
    </>
  )
}
