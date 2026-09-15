import { TextInput, View } from 'react-native'

import { colors } from '@/theme/tokens'

type TextFieldProps = {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  multiline?: boolean
  autoFocus?: boolean
  accessibilityLabel?: string
  onSubmitEditing?: () => void
}

/** Single- or multi-line input on a surface card (docs/07). No labels above — the question is the label. */
export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoFocus = false,
  accessibilityLabel,
  onSubmitEditing,
}: TextFieldProps) {
  return (
    <View className="rounded-card border border-hairline bg-surface px-4 py-3">
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.soft}
        multiline={multiline}
        autoFocus={autoFocus}
        submitBehavior={multiline ? 'newline' : 'blurAndSubmit'}
        returnKeyType={multiline ? 'default' : 'done'}
        onSubmitEditing={onSubmitEditing}
        selectionColor={colors.cornflower.DEFAULT}
        className="font-sans text-body text-ink"
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  )
}
