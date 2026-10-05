import { useState, type ReactNode } from 'react'
import { Animated, Pressable, View, type PressableProps } from 'react-native'

/**
 * The press feedback for a card-sized target (docs/07): a gentle spring inward,
 * 200–300ms, no bounce on release. Small controls use `active:` classes; this
 * is for the things big enough that a colour change alone reads as nothing.
 */
export function PressScale({
  children,
  className,
  scale = 0.97,
  wrapperClassName,
  ...props
}: PressableProps & {
  children?: ReactNode
  className?: string
  scale?: number
  /** Classes for the animated wrapper, e.g. `w-72` so it sizes the card. */
  wrapperClassName?: string
}) {
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
    // The sizing classes go on a plain View: NativeWind doesn't style
    // Animated.View, so a className there was silently dropped.
    <View className={wrapperClassName}>
      <Animated.View style={{ flexGrow: 1, transform: [{ scale: value }] }}>
        <Pressable
          {...props}
          // `grow`, not `flex-1`: flex: 1 sets a zero basis, so in an auto-height
          // row the card's own content didn't count toward its height and it
          // collapsed to the row's other cards until a press re-laid it out.
          className={`grow ${className ?? ''}`}
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
    </View>
  )
}
