import { useState } from 'react'
import { TextInput, type TextInputProps, View } from 'react-native'

import { colors } from '@/theme/tokens'

const MIN_MULTILINE_HEIGHT = 72

type TextFieldProps = {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  multiline?: boolean
  autoFocus?: boolean
  accessibilityLabel?: string
  onSubmitEditing?: () => void
  /** Sign-in fields need the keyboard and autofill hints a prose field doesn't. */
  secureTextEntry?: boolean
  keyboardType?: TextInputProps['keyboardType']
  autoCapitalize?: TextInputProps['autoCapitalize']
  autoComplete?: TextInputProps['autoComplete']
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}

/**
 * Single- or multi-line input on a surface card (docs/07). No labels above — the
 * question is the label. Multi-line fields grow with what's written.
 */
export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoFocus = false,
  accessibilityLabel,
  onSubmitEditing,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  autoComplete,
  testID,
}: TextFieldProps) {
  const [contentHeight, setContentHeight] = useState(0)
  return (
    <View className="rounded-card border border-hairline bg-surface px-4 py-3">
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.soft}
        multiline={multiline}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        submitBehavior={multiline ? 'newline' : 'blurAndSubmit'}
        returnKeyType={multiline ? 'default' : 'done'}
        onSubmitEditing={onSubmitEditing}
        selectionColor={colors.cornflower.DEFAULT}
        className="font-sans text-body text-ink"
        onContentSizeChange={
          multiline ? (e) => setContentHeight(e.nativeEvent.contentSize.height) : undefined
        }
        style={
          multiline
            ? {
                minHeight: MIN_MULTILINE_HEIGHT,
                height: Math.max(MIN_MULTILINE_HEIGHT, contentHeight),
                textAlignVertical: 'top',
              }
            : undefined
        }
      />
    </View>
  )
}
