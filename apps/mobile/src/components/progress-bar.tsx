import { useEffect, useState } from 'react'
import { Animated, Easing, View } from 'react-native'

import { gradientStyle } from '@/components/texture'
import { colors } from '@/theme/tokens'

type ProgressBarProps = {
  /** One segment per page; inserted pages (Ask) extend it (docs/05). */
  total: number
  /** 0-based. */
  current: number
  /**
   * The finish, over this many ms: a shine runs along the bar, segments light
   * sun one after another throwing off glints, then fade back (docs/07).
   * Absent, the bar stays still.
   */
  celebrateMs?: number
}

/** The activity's page progress (docs/07): segments, not a percentage. */
export function ProgressBar({ total, current, celebrateMs }: ProgressBarProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}
      className="flex-row gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-pill ${
            i < current ? 'bg-cornflower-deep' : i === current ? 'bg-cornflower' : 'bg-hairline'
          }`}
        />
      ))}
      {celebrateMs ? <Glow total={total} duration={celebrateMs} /> : null}
    </View>
  )
}

// Where each segment's glints go: along it (0–1), how far they drift, and
// how big. Fixed, so the finish looks the same every time.
const GLINTS = [
  { along: 0.2, dx: -8, dy: 18, size: 14 },
  { along: 0.55, dx: 5, dy: -12, size: 11 },
  { along: 0.85, dx: 10, dy: 26, size: 18 },
]
const GLINT = gradientStyle(
  `radial-gradient(closest-side, ${colors.surface} 0%, ${colors.sun.DEFAULT} 35%, ${colors.sun.DEFAULT} 55%, ${colors.sun.DEFAULT}00 100%)`,
)
const SHINE_WIDTH = 44
const SHINE = gradientStyle(
  `radial-gradient(closest-side, ${colors.surface} 0%, ${colors.surface}cc 40%, ${colors.surface}00 100%)`,
)

/**
 * Sun over each segment in turn, with a white shine running just ahead of it
 * and a few glints thrown off each segment as it lights; held a moment, then
 * gone. Mount-only. Styled inline: NativeWind doesn't reach an Animated.View on web.
 */
function Glow({ total, duration }: { total: number; duration: number }) {
  const [progress] = useState(() => new Animated.Value(0))
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const run = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: 150,
      easing: Easing.linear,
      useNativeDriver: true,
    })
    run.start()
    return () => run.stop()
  }, [duration, progress])

  const gap = 4
  const segment = total > 0 ? (width - gap * (total - 1)) / total : 0
  const startOf = (i: number) => (i / total) * 0.5

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 flex-row gap-1"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {Array.from({ length: total }, (_, i) => {
        const start = startOf(i)
        return (
          <Animated.View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              backgroundColor: colors.sun.DEFAULT,
              opacity: progress.interpolate({
                // A quick turn, so sun over blue doesn't linger as grey.
                inputRange: [0, start, start + 0.04, 0.75, 1],
                outputRange: [0, 0, 1, 1, 0],
                extrapolate: 'clamp',
              }),
            }}
          />
        )
      })}

      {width > 0 ? (
        <Animated.View
          style={[
            SHINE,
            {
              position: 'absolute',
              top: -6,
              left: 0,
              width: SHINE_WIDTH,
              height: 16,
              opacity: progress.interpolate({
                inputRange: [0, 0.02, 0.5, 0.6],
                outputRange: [0, 1, 1, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.55],
                    outputRange: [-SHINE_WIDTH / 2, width - SHINE_WIDTH / 2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {width > 0
        ? Array.from({ length: total }, (_, i) =>
            GLINTS.map((t, k) => {
              const start = startOf(i) + 0.04 + k * 0.02
              const end = start + 0.22
              const peak = start + 0.07
              return (
                <Animated.View
                  key={`${i}-${k}`}
                  style={{
                    position: 'absolute',
                    top: 2 - t.size / 2,
                    left: i * (segment + gap) + t.along * segment - t.size / 2,
                    width: t.size,
                    height: t.size,
                    opacity: progress.interpolate({
                      inputRange: [0, start, peak, end],
                      outputRange: [0, 0, 1, 0],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateX: progress.interpolate({
                          inputRange: [0, start, end],
                          outputRange: [0, 0, t.dx],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        translateY: progress.interpolate({
                          inputRange: [0, start, end],
                          outputRange: [0, 0, t.dy],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: progress.interpolate({
                          inputRange: [0, start, peak, end],
                          outputRange: [0.2, 0.2, 1, 0.4],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  }}
                >
                  <Glint size={t.size} />
                </Animated.View>
              )
            }),
          )
        : null}
    </View>
  )
}

/** A glint: a small sun dot with a bright core and a soft halo. */
function Glint({ size }: { size: number }) {
  return <View style={[{ width: size, height: size, borderRadius: 999 }, GLINT]} />
}
