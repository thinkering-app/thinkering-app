import { router } from 'expo-router'
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import type { Frequency, ReadingAmount } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { StepScreen } from '@/intake/step-screen'
import { colors } from '@/theme/tokens'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'several_weekly', label: 'Several times a week' },
  { value: 'when_i_can', label: 'When I can' },
]

const READING: { value: ReadingAmount; label: string }[] = [
  { value: 'less', label: 'Short' },
  { value: 'balanced', label: 'Medium' },
  { value: 'more', label: 'Long' },
]

const PRESET_MINUTES = [5, 10, 15]

/**
 * Step 6 (docs/01 §1) — frequency, session length and reading per page. This
 * screen is also what buys G3 its time; nothing here waits on a generation.
 * Reading starts on "Medium", so it never holds up Continue.
 */
export default function TimeStep() {
  const { answers, update } = useIntake()
  // A picked-up draft may already hold a length that isn't one of the presets.
  const [customOpen, setCustomOpen] = useState(
    () => answers.sessionMinutes !== null && !PRESET_MINUTES.includes(answers.sessionMinutes),
  )
  const [custom, setCustom] = useState(() => (customOpen ? String(answers.sessionMinutes) : ''))
  const ready = answers.frequency !== null && answers.sessionMinutes !== null

  return (
    <StepScreen
      step={6}
      question="How much time do you want to spend?"
      continueDisabled={!ready}
      onContinue={() => router.push('/intake/direction')}
    >
      <View className="gap-3">
        <Text className="font-sans text-secondary text-ink-soft">How often</Text>
        <View className="flex-row flex-wrap gap-2">
          {FREQUENCIES.map((option) => (
            <ChoiceChip
              key={option.value}
              testID={`intake-frequency-${option.value}`}
              label={option.label}
              selected={answers.frequency === option.value}
              onPress={() => update({ frequency: option.value })}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-sans text-secondary text-ink-soft">Each session</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {PRESET_MINUTES.map((minutes) => (
            <ChoiceChip
              key={minutes}
              testID={`intake-minutes-${minutes}`}
              label={`${minutes} min`}
              selected={answers.sessionMinutes === minutes}
              onPress={() => {
                setCustomOpen(false)
                update({ sessionMinutes: minutes })
              }}
            />
          ))}
          <ChoiceChip
            label="Custom"
            selected={customOpen}
            onPress={() => {
              setCustomOpen(true)
              update({ sessionMinutes: Number(custom) > 0 ? Number(custom) : null })
            }}
          />
          {customOpen ? (
            <View className="flex-row items-center gap-2 rounded-pill border border-cornflower-deep bg-cornflower-tint px-4 py-2.5">
              <TextInput
                accessibilityLabel="Custom session length in minutes"
                value={custom}
                onChangeText={(text) => {
                  const digits = text.replace(/[^0-9]/g, '').slice(0, 3)
                  setCustom(digits)
                  update({ sessionMinutes: Number(digits) > 0 ? Number(digits) : null })
                }}
                keyboardType="number-pad"
                maxLength={3}
                selectionColor={colors.cornflower.DEFAULT}
                className="min-w-8 font-sans-medium text-body text-cornflower-deep"
              />
              <Text className="font-sans-medium text-body text-cornflower-deep">min</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-sans text-secondary text-ink-soft">Reading per page</Text>
        <View className="flex-row flex-wrap gap-2">
          {READING.map((option) => (
            <ChoiceChip
              key={option.value}
              testID={`intake-reading-${option.value}`}
              label={option.label}
              selected={answers.readingAmount === option.value}
              onPress={() => update({ readingAmount: option.value })}
            />
          ))}
        </View>
      </View>
    </StepScreen>
  )
}
