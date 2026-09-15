import { useEffect, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'

import { colors } from '@/theme/tokens'

type GeneratingProps = {
  /** One short line — what's being made, not a status ("Putting a path together"). */
  label: string
}

/**
 * The branded wait (docs/01 §1 step 4/5): three dots breathing in the palette.
 * Calm, no spinner, no progress theatre — the wait is usually a second or two.
 */
export function Generating({ label }: GeneratingProps) {
  // Lazy state, not a ref: the animated value must be stable but is read during render.
  const [progress] = useState(() => new Animated.Value(0))

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

  const dotColors = [colors.cornflower.DEFAULT, colors.leaf.DEFAULT, colors.peach.DEFAULT]

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} className="items-center gap-4 py-10">
      <View className="flex-row gap-2">
        {dotColors.map((color, i) => (
          <Animated.View
            key={color}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: color,
              opacity: progress.interpolate({
                inputRange: [i - 0.6, i, i + 0.6, i + 2.4, i + 3],
                outputRange: [0.25, 1, 0.25, 0.25, 1],
                extrapolate: 'clamp',
              }),
            }}
          />
        ))}
      </View>
      <Text className="font-sans text-secondary text-ink-soft">{label}</Text>
    </View>
  )
}
