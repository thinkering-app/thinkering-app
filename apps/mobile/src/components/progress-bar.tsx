import { View } from 'react-native'

type ProgressBarProps = {
  /** One segment per page; inserted pages (Ask) extend it (docs/05). */
  total: number
  /** 0-based. */
  current: number
}

/** The activity's page progress (docs/07): segments, not a percentage. */
export function ProgressBar({ total, current }: ProgressBarProps) {
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
    </View>
  )
}
