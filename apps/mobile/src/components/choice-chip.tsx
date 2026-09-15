import { Pressable, Text } from 'react-native'

type ChoiceChipProps = {
  label: string
  selected?: boolean
  onPress?: () => void
  /** `quiet` is the example/suggestion treatment — present but not competing. */
  variant?: 'default' | 'quiet'
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}

/**
 * Intake and topic selection chip (docs/07). Wraps in a row; selected is a
 * cornflower tint with a deep border so it reads as chosen without shouting.
 */
export function ChoiceChip({
  label,
  selected = false,
  onPress,
  variant = 'default',
  testID,
}: ChoiceChipProps) {
  const base = 'rounded-pill border px-4 py-2.5 active:bg-cornflower-tint'
  const tone = selected
    ? 'border-cornflower-deep bg-cornflower-tint'
    : variant === 'quiet'
      ? 'border-hairline bg-transparent'
      : 'border-hairline bg-surface'
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`${base} ${tone}`}
    >
      <Text
        className={
          selected
            ? 'font-sans-medium text-body text-cornflower-deep'
            : variant === 'quiet'
              ? 'font-sans text-secondary text-ink-soft'
              : 'font-sans-medium text-body text-ink'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
