import { Pressable, Text } from 'react-native'

type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'quiet'
  disabled?: boolean
}

/** Primary cornflower / quiet ghost (docs/07). */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const primary = variant === 'primary'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={
        primary
          ? `items-center rounded-pill bg-cornflower px-6 py-3 active:bg-cornflower-deep ${disabled ? 'opacity-40' : ''}`
          : `items-center rounded-pill px-6 py-3 active:bg-cornflower-tint ${disabled ? 'opacity-40' : ''}`
      }
    >
      <Text
        className={
          primary ? 'font-sans-medium text-body text-white' : 'font-sans-medium text-body text-ink'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
