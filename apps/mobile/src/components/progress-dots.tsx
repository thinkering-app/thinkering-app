import { View } from 'react-native'

type ProgressDotsProps = {
  /** 1-based. */
  current: number
  total: number
}

/** Intake progress (docs/01 §1): dots, no numbers, no percentage. */
export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      className="flex-row items-center gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={
            i + 1 === current
              ? 'h-2 w-5 rounded-pill bg-cornflower'
              : i + 1 < current
                ? 'h-2 w-2 rounded-pill bg-cornflower-deep'
                : 'h-2 w-2 rounded-pill bg-hairline'
          }
        />
      ))}
    </View>
  )
}
