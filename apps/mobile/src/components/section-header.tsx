import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import type { Section } from '@thinkering/core'

import { useReduceMotion } from '@/features/activity-player/celebration'
import { colors } from '@/theme/tokens'

type SectionHeaderProps = {
  section: Section
  /** Activities completed in this section today; drives the check and the count (docs/01 §3). */
  completedToday?: number
  /** Changes when another interest is selected: the check then appears without popping. */
  resetKey?: string
  onConfigure?: () => void
}

export const SECTION_LABELS: Record<Section, string> = {
  next: 'Next',
  strengthen: 'Strengthen',
  go_further: 'Go further',
}

/** Long enough for the pop back to Today to finish, so the arrival is seen. */
const ARRIVAL_DELAY_MS = 300

// Where the palette dots land around the check, in px from its centre.
const BURST = [
  { color: colors.cornflower.DEFAULT, x: -16, y: -9 },
  { color: colors.leaf.DEFAULT, x: 13, y: -14 },
  { color: colors.peach.DEFAULT, x: 17, y: 8 },
  { color: colors.sun.DEFAULT, x: -11, y: 14 },
]

/**
 * Today's section heading (docs/07). Completing something in a section today
 * adds a sun check and the count — it celebrates, it doesn't lock: the
 * remaining cards stay.
 */
export function SectionHeader({
  section,
  completedToday = 0,
  resetKey = '',
  onConfigure,
}: SectionHeaderProps) {
  const done = completedToday > 0
  const { pop, burst } = useArrival(done, resetKey)
  return (
    <View className="flex-row items-center justify-between px-3 py-2">
      <View className="flex-row items-center gap-2">
        <Text className="font-heading-bold text-heading text-ink">{SECTION_LABELS[section]}</Text>
        {done ? (
          <>
            {/* Styled inline: NativeWind doesn't reach an Animated.View on web. */}
            <View style={{ width: 20, height: 20 }}>
              {BURST.map((dot) => (
                <Animated.View
                  key={dot.color}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 7,
                    top: 7,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: dot.color,
                    opacity: burst.interpolate({
                      inputRange: [0, 0.15, 1],
                      outputRange: [0, 1, 0],
                    }),
                    transform: [
                      {
                        translateX: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dot.x],
                        }),
                      },
                      {
                        translateY: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dot.y],
                        }),
                      },
                    ],
                  }}
                />
              ))}
              <Animated.View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.sun.DEFAULT,
                  opacity: pop.interpolate({
                    inputRange: [0, 0.3],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [{ scale: pop }],
                }}
              >
                <Ionicons name="checkmark" size={14} color={colors.ink.DEFAULT} />
              </Animated.View>
            </View>
            <Text className="font-sans text-caption text-ink-soft">{completedToday} today</Text>
          </>
        ) : null}
      </View>
      {onConfigure ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Configure ${SECTION_LABELS[section]}`}
          onPress={onConfigure}
          hitSlop={12}
        >
          <Ionicons name="options-outline" size={18} color={colors.ink.soft} />
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * The check's arrival: when a section turns done while Today is in view —
 * coming back from a finished activity — the check springs in and throws off a
 * few palette dots. Done at mount, on another interest, or with Reduce Motion
 * on, it's simply there.
 */
function useArrival(done: boolean, resetKey: string) {
  const reduceMotion = useReduceMotion()
  const [pop] = useState(() => new Animated.Value(done ? 1 : 0))
  const [burst] = useState(() => new Animated.Value(0))
  const last = useRef({ done, resetKey })

  useEffect(() => {
    const turnedOn = done && !last.current.done && last.current.resetKey === resetKey
    last.current = { done, resetKey }
    if (!turnedOn || reduceMotion !== false) {
      pop.stopAnimation()
      burst.stopAnimation()
      pop.setValue(done ? 1 : 0)
      burst.setValue(0)
      return
    }
    pop.setValue(0)
    burst.setValue(0)
    const arrival = Animated.sequence([
      Animated.delay(ARRIVAL_DELAY_MS),
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
        Animated.timing(burst, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ])
    arrival.start()
    return () => arrival.stop()
  }, [done, resetKey, reduceMotion, pop, burst])

  return { pop, burst }
}
