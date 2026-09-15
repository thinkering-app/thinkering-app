import { Text, View } from 'react-native'

type MeterProps = {
  label: string
  /** 0–1; clamped. */
  fraction: number
  /** The quiet line under the bar — what the number means, or when it resets. */
  caption?: string
}

/** The AI usage meter (docs/07): one bar, one number, no dials. */
export function Meter({ label, fraction, caption }: MeterProps) {
  const filled = Math.max(0, Math.min(1, fraction))
  const percent = Math.round(filled * 100)
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans-medium text-body text-ink">{label}</Text>
        <Text className="font-sans text-secondary text-ink-soft">{percent}%</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        className="h-2 overflow-hidden rounded-pill bg-hairline"
      >
        <View
          className={`h-2 rounded-pill ${filled >= 1 ? 'bg-peach' : 'bg-cornflower'}`}
          style={{ width: `${percent}%` }}
        />
      </View>
      {caption ? <Text className="font-sans text-caption text-ink-soft">{caption}</Text> : null}
    </View>
  )
}
