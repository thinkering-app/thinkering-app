import { Pressable, Text } from 'react-native'

type PillProps = {
  label: string
  selected?: boolean
  onPress?: () => void
}

/** Selector pill: selected = cornflower fill, white text (docs/07). */
export function Pill({ label, selected = false, onPress }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={
        selected
          ? 'rounded-pill bg-cornflower px-4 py-2 active:bg-cornflower-deep'
          : 'rounded-pill border border-hairline bg-surface px-4 py-2 active:bg-cornflower-tint'
      }
    >
      <Text
        className={
          selected
            ? 'font-sans-medium text-secondary text-white'
            : 'font-sans-medium text-secondary text-ink'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
