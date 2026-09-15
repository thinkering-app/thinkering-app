import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing } from 'react-native'

/**
 * The page-arrival motion (docs/07): a short fade with a few pixels of lift.
 * Mount-only — give it a `key` that changes when the content does.
 */
export function FadeIn({ children, duration = 240 }: { children?: ReactNode; duration?: number }) {
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [duration, progress])

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  )
}
