import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { TextField } from '@/components/text-field'

type OptionalNoteProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}

/**
 * The small optional free-text affordance on intake steps 2 and 3 (docs/01):
 * a quiet line that opens a field. Kept closed by default so the question stays
 * the screen.
 */
export function OptionalNote({ label, value, onChangeText, placeholder }: OptionalNoteProps) {
  const [open, setOpen] = useState(value.length > 0)

  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8} className="self-start">
        <Text className="font-sans text-secondary text-ink-soft underline">{label}</Text>
      </Pressable>
    )
  }
  return (
    <View className="gap-2">
      <Text className="font-sans text-secondary text-ink-soft">{label}</Text>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={label}
        multiline
        autoFocus
      />
    </View>
  )
}
