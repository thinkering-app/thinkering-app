import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native'
import type { Tier } from '@thinkering/core'

import { gradientStyle, Wash, type WashColor } from '@/components/texture'
import { colors } from '@/theme/tokens'

/**
 * The summary page's arrival (docs/07 §Components): one celebration per
 * section, in the palette, across the whole page, never confetti. Next's
 * progress bar glows sun (`ProgressBar`'s `celebrate`) as sunlight washes down
 * the page, Strengthen's dots rise all over it, Go further's washes bloom in.
 * With Reduce Motion on, none of it moves.
 *
 * Everything animated is styled inline: NativeWind doesn't reach an
 * Animated.View on web.
 */

export type Celebration = 'bar' | 'dots' | 'bloom'

export const CELEBRATION_BY_TIER: Record<Tier, Celebration> = {
  introduce: 'bar',
  strengthen: 'dots',
  apply: 'bloom',
}

/** How long each plays, in ms — the bar's sweep and the sunlight share one. */
export const CELEBRATION_MS: Record<Celebration, number> = {
  bar: 2400,
  dots: 3200,
  bloom: 3600,
}

/** The OS Reduce Motion setting, live; `null` until the OS has answered. */
export function useReduceMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduced(value)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return reduced
}

/** A 0→1 value that runs once on mount, after the page's own fade-in has begun. */
export function useOnce(duration: number, easing: (t: number) => number) {
  const [progress] = useState(() => new Animated.Value(0))
  useEffect(() => {
    const run = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: 150,
      easing,
      useNativeDriver: true,
    })
    run.start()
    return () => run.stop()
  }, [duration, easing, progress])
  return progress
}

const SUNLIGHT = gradientStyle(
  `linear-gradient(to bottom, ${colors.sun.DEFAULT}59 0%, ${colors.sun.tint}66 45%, ${colors.sun.tint}00 100%)`,
)
const EASE_IN_OUT = Easing.inOut(Easing.quad)
const EASE_OUT = Easing.out(Easing.cubic)

/** Next: warm light that settles down the page with the bar's sweep, then lifts. */
export function Sunlight() {
  const progress = useOnce(CELEBRATION_MS.bar, EASE_IN_OUT)
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        SUNLIGHT,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, 1, 0.8, 0],
          }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-240, 0] }) },
          ],
        },
      ]}
    />
  )
}

// Fixed, not random: the same summary celebrates the same way every time.
// `top` is where a dot starts, as a share of the page; it rises from there.
const DOTS: {
  left: `${number}%`
  top: `${number}%`
  size: number
  color: WashColor
  start: number
  rise: number
}[] = [
  { left: '6%', top: '14%', size: 8, color: 'leaf', start: 0, rise: 120 },
  { left: '22%', top: '10%', size: 6, color: 'sun', start: 0.1, rise: 150 },
  { left: '38%', top: '16%', size: 10, color: 'peach', start: 0.04, rise: 110 },
  { left: '55%', top: '12%', size: 7, color: 'cornflower', start: 0.16, rise: 140 },
  { left: '72%', top: '15%', size: 9, color: 'leaf', start: 0.07, rise: 125 },
  { left: '88%', top: '11%', size: 6, color: 'peach', start: 0.13, rise: 155 },
  { left: '12%', top: '42%', size: 9, color: 'sun', start: 0.12, rise: 170 },
  { left: '30%', top: '48%', size: 6, color: 'leaf', start: 0.2, rise: 140 },
  { left: '64%', top: '44%', size: 8, color: 'peach', start: 0.09, rise: 180 },
  { left: '84%', top: '50%', size: 10, color: 'cornflower', start: 0.18, rise: 150 },
  { left: '8%', top: '76%', size: 7, color: 'peach', start: 0.22, rise: 190 },
  { left: '26%', top: '84%', size: 9, color: 'cornflower', start: 0.15, rise: 170 },
  { left: '47%', top: '78%', size: 6, color: 'sun', start: 0.26, rise: 200 },
  { left: '68%', top: '86%', size: 8, color: 'leaf', start: 0.19, rise: 180 },
  { left: '90%', top: '80%', size: 7, color: 'sun', start: 0.24, rise: 160 },
]

/** Strengthen: palette dots drift up all over the page and fade. */
export function RisingDots() {
  const progress = useOnce(CELEBRATION_MS.dots, Easing.linear)
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DOTS.map((dot) => {
        const end = Math.min(1, dot.start + 0.7)
        const mid = dot.start + (end - dot.start) * 0.25
        return (
          <Animated.View
            key={`${dot.left}-${dot.top}`}
            style={{
              position: 'absolute',
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              borderRadius: 999,
              backgroundColor: colors[dot.color].DEFAULT,
              opacity: progress.interpolate({
                inputRange: [0, dot.start, mid, end, 1],
                outputRange: [0, 0, 0.9, 0, 0],
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, dot.start, end, 1],
                    outputRange: [0, 0, -dot.rise, -dot.rise],
                  }),
                },
              ],
            }}
          />
        )
      })}
    </View>
  )
}

const WASHES: { color: WashColor; size: number; className: string }[] = [
  { color: 'sun', size: 320, className: '-right-32 top-16' },
  { color: 'peach', size: 280, className: '-bottom-24 -left-28' },
]

// Go further's are larger and one more, so the bloom reaches across the page.
const BLOOMS: { color: WashColor; size: number; className: string }[] = [
  { color: 'sun', size: 420, className: '-right-40 top-8' },
  { color: 'peach', size: 380, className: '-left-44 top-1/3' },
  { color: 'peach', size: 400, className: '-bottom-32 -right-36' },
]

/** The summary's washes (docs/07); on Go further they bloom in from nothing. */
export function SummaryWashes({ bloom }: { bloom: boolean }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      {bloom
        ? BLOOMS.map((wash, i) => <BloomWash key={i} {...wash} />)
        : WASHES.map((wash, i) => <Wash key={i} {...wash} />)}
    </View>
  )
}

/**
 * Grows from a point while the palette colour flushes through it, then
 * settles to the ordinary tint, so the wash at rest is still color in the paper.
 */
function BloomWash({ color, size, className }: (typeof BLOOMS)[number]) {
  const progress = useOnce(CELEBRATION_MS.bloom, EASE_OUT)
  const scale = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.15, 1, 1] })
  return (
    // The plain View takes the position; the Animated ones only scale and fade.
    <View className={`absolute ${className}`} style={{ width: size, height: size }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale }],
          },
        ]}
      >
        <Wash color={color} size={size} className="left-0 top-0" />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            // Holds the colour a while before it settles, so the bloom reads.
            opacity: progress.interpolate({
              inputRange: [0, 0.3, 0.7, 1],
              outputRange: [0, 1, 0.9, 0],
            }),
            transform: [{ scale }],
          },
        ]}
      >
        <Wash color={color} size={size} tone="flush" className="left-0 top-0" />
      </Animated.View>
    </View>
  )
}
