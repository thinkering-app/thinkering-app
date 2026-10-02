import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TextInput, View } from 'react-native'
import type { Frequency } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { StepScreen } from '@/intake/step-screen'
import { colors } from '@/theme/tokens'

const FREQUENCY_KEY = {
  daily: 'intake.time.frequency.daily',
  several_weekly: 'intake.time.frequency.severalWeekly',
  when_i_can: 'intake.time.frequency.whenICan',
} as const satisfies Record<Frequency, string>

const FREQUENCIES: Frequency[] = ['daily', 'several_weekly', 'when_i_can']

const PRESET_MINUTES = [5, 10, 15]

/**
 * Step 6 (docs/01 §1) — frequency and session length together. This screen is
 * also what buys G3 its time; nothing here waits on a generation.
 */
export default function TimeStep() {
  const { t } = useTranslation()
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
      question={t('intake.time.question')}
      continueDisabled={!ready}
      onContinue={() => router.push('/intake/direction')}
    >
      <View className="gap-3">
        <Text className="font-sans text-secondary text-ink-soft">{t('intake.time.howOften')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {FREQUENCIES.map((value) => (
            <ChoiceChip
              key={value}
              testID={`intake-frequency-${value}`}
              label={t(FREQUENCY_KEY[value])}
              selected={answers.frequency === value}
              onPress={() => update({ frequency: value })}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-sans text-secondary text-ink-soft">
          {t('intake.time.eachSession')}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {PRESET_MINUTES.map((minutes) => (
            <ChoiceChip
              key={minutes}
              testID={`intake-minutes-${minutes}`}
              label={t('intake.time.minutes', { count: minutes })}
              selected={answers.sessionMinutes === minutes}
              onPress={() => {
                setCustomOpen(false)
                update({ sessionMinutes: minutes })
              }}
            />
          ))}
          <ChoiceChip
            label={t('intake.time.custom')}
            selected={customOpen}
            onPress={() => {
              setCustomOpen(true)
              update({ sessionMinutes: Number(custom) > 0 ? Number(custom) : null })
            }}
          />
          {customOpen ? (
            <View className="flex-row items-center gap-2 rounded-pill border border-cornflower-deep bg-cornflower-tint px-4 py-2.5">
              <TextInput
                accessibilityLabel={t('intake.time.customAccessibilityLabel')}
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
              <Text className="font-sans-medium text-body text-cornflower-deep">
                {t('intake.time.minUnit')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </StepScreen>
  )
}
