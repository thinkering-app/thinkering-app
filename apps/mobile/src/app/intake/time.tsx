import { router } from 'expo-router'
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import type { Frequency } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { StepScreen } from '@/intake/step-screen'
import { colors } from '@/theme/tokens'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'several_weekly', label: 'Several times a week' },
  { value: 'when_i_can', label: 'When I can' },
]

const PRESET_MINUTES = [5, 10, 15]

/**
 * Step 6 (docs/01 §1) — frequency and session length together. This screen is
 * also what buys G3 its time; nothing here waits on a generation.
 */
export default function TimeStep() {
  const { answers, update } = useIntake()
  const [custom, setCustom] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
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
    </StepScreen>
  )
}
