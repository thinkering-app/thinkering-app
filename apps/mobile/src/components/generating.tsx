import { Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { colors } from '@/theme/tokens'

type GeneratingProps = {
  /** One short line — what's being made, not a status ("Putting a path together"). */
  label: string
}

/**
 * The branded wait (docs/01 §1 step 4/5): three dots breathing in the palette.
 * Calm, no spinner, no progress theatre.
 *
 * A Reanimated CSS animation, not an `Animated.loop`. A native-driven loop ends
 * for good the moment its value is detached from the view — a re-render that
 * swaps the view's animated props is enough — and the value it leaves behind is
 * the first frame, so the dots froze on blue after a cycle or two. This one runs
 * on the UI thread and belongs to the view, so nothing React does can stop it.
 */
export function Generating({ label }: GeneratingProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="items-center gap-4 py-10"
    >
      <View className="flex-row gap-2">
        {DOTS.map(({ color, keyframes }) => (
          <Animated.View
            key={color}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: color,
              animationName: keyframes,
              animationDuration: CYCLE_MS,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
          />
        ))}
      </View>
      <Text className="font-sans text-secondary text-ink-soft">{label}</Text>
    </View>
  )
}

/** One full pass over the three dots. */
const CYCLE_MS = 1800
const DIM = 0.25

/**
 * Each dot brightens in turn: full at its own third of the cycle, dim again a
 * fifth of a cycle either side of it, and dim for the rest.
 */
const DOTS = [colors.cornflower.DEFAULT, colors.leaf.DEFAULT, colors.peach.DEFAULT].map(
  (color, i) => {
    const peak = (i * 100) / 3
    const keyframes =
      i === 0
        ? {
            '0%': { opacity: 1 },
            '20%': { opacity: DIM },
            '80%': { opacity: DIM },
            '100%': { opacity: 1 },
          }
        : {
            '0%': { opacity: DIM },
            [`${peak - 20}%`]: { opacity: DIM },
            [`${peak}%`]: { opacity: 1 },
            [`${peak + 20}%`]: { opacity: DIM },
            '100%': { opacity: DIM },
          }
    return { color, keyframes }
  },
)
