import { useState, type ReactNode } from 'react'
import { Animated, Pressable, type PressableProps } from 'react-native'

/**
 * The press feedback for a card-sized target (docs/07): a gentle spring inward,
 * 200–300ms, no bounce on release. Small controls use `active:` classes; this
 * is for the things big enough that a colour change alone reads as nothing.
 */
export function PressScale({
  children,
  className,
  scale = 0.97,
  ...props
}: PressableProps & { children?: ReactNode; className?: string; scale?: number }) {
  // State, not a ref: reading a ref during render is a lint error here, and the
  // value is created once either way (same pattern as `Generating`).
  const [value] = useState(() => new Animated.Value(1))

  const spring = (to: number) =>
    Animated.spring(value, {
      toValue: to,
      speed: 20,
      bounciness: 4,
      useNativeDriver: true,
    }).start()

  return (
    <Animated.View style={{ transform: [{ scale: value }] }}>
      <Pressable
        {...props}
        className={className}
        onPressIn={(e) => {
          spring(scale)
          props.onPressIn?.(e)
        }}
        onPressOut={(e) => {
          spring(1)
          props.onPressOut?.(e)
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
