import { isOverLimit, TEXT_LIMIT_COUNTER_FROM, TEXT_LIMITS, type TextLimit } from '@thinkering/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TextInput, type TextInputProps, View } from 'react-native'

import { currentFormatLocale } from '@/i18n'
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
  /** Off for anything that isn't prose — a pasted code should stay as typed. */
  autoCorrect?: boolean
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
  /**
   * How much the field takes (`TEXT_LIMITS`). A soft limit: past it the text
   * stays and the screen holds back sending (`isOverLimit`), so a long paste
   * is never cut without the learner seeing it.
   */
  limit?: TextLimit
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
  autoCorrect,
  testID,
  limit,
}: TextFieldProps) {
  const { t } = useTranslation()
  const [contentHeight, setContentHeight] = useState(0)
  const max = limit ? TEXT_LIMITS[limit] : undefined
  const over = limit ? isOverLimit(value, limit) : false
  // Always the same tree: the counter appearing mustn't remount the input and drop focus.
  return (
    <View className="gap-1">
      <View
        className={`rounded-card border bg-surface px-4 py-3 ${over ? 'border-peach' : 'border-hairline'}`}
      >
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
          autoCorrect={autoCorrect}
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
      {max !== undefined && value.length >= max * TEXT_LIMIT_COUNTER_FROM ? (
        <Text
          accessibilityLiveRegion="polite"
          className={`self-end px-1 font-sans text-caption ${over ? 'text-ink' : 'text-ink-soft'}`}
        >
          {t(over ? 'common.textField.counterOver' : 'common.textField.counter', {
            length: formatNumber(value.length),
            max: formatNumber(max),
          })}
        </Text>
      ) : null}
    </View>
  )
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat(currentFormatLocale()).format(n)
}
