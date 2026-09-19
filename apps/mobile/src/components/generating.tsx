import { memo, useEffect, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'

import { colors } from '@/theme/tokens'

type GeneratingProps = {
  /** One short line — what's being made, not a status ("Putting a path together"). */
  label: string
}

/**
 * The branded wait (docs/01 §1 step 4/5): three dots breathing in the palette.
 * Calm, no spinner, no progress theatre.
 */
export const Generating = memo(function Generating({ label }: GeneratingProps) {
  // Lazy state, not a ref: the animated nodes must be stable but are read during
  // render. The interpolations especially: a new node on re-render makes
  // Animated rebuild the view's props from the JS-side value, which never moves
  // under the native driver — the dots snap back to the first one, and a
  // streaming parent re-renders often enough to hold them there.
  const [progress] = useState(() => new Animated.Value(0))
  const [dots] = useState(() =>
    DOT_COLORS.map((color, i) => ({
      color,
      opacity: progress.interpolate({
        inputRange: [i - 0.6, i, i + 0.6, i + 2.4, i + 3],
        outputRange: [0.25, 1, 0.25, 0.25, 1],
        extrapolate: 'clamp',
      }),
    })),
  )

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 3,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [progress])

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="items-center gap-4 py-10"
    >
      <View className="flex-row gap-2">
        {dots.map(({ color, opacity }) => (
          <Animated.View
            key={color}
            style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color, opacity }}
          />
        ))}
      </View>
      <Text className="font-sans text-secondary text-ink-soft">{label}</Text>
    </View>
  )
})

const DOT_COLORS = [colors.cornflower.DEFAULT, colors.leaf.DEFAULT, colors.peach.DEFAULT]
