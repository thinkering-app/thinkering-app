import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { isOverLimit, type ExperienceChoice } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { OptionalNote } from '@/intake/optional-note'
import { StepScreen } from '@/intake/step-screen'

const OPTION_KEY = {
  getting_started: 'intake.experience.options.gettingStarted',
  explored: 'intake.experience.options.explored',
  in_middle: 'intake.experience.options.inMiddle',
  experienced: 'intake.experience.options.experienced',
} as const satisfies Record<ExperienceChoice, string>

const OPTIONS: ExperienceChoice[] = ['getting_started', 'explored', 'in_middle', 'experienced']

/**
 * Step 3 (docs/01 §1). On advance, G2 (waits on G1) and G2b go out together:
 * topics for step 4, what success could look like for step 5.
 */
export default function ExperienceStep() {
  const { t } = useTranslation()
  const { answers, update, startChoices } = useIntake()

  return (
    <StepScreen
      step={3}
      question={t('intake.experience.question')}
      continueDisabled={!answers.experienceChoice || isOverLimit(answers.experienceText, 'note')}
      onContinue={() => {
        startChoices()
        router.push('/intake/topics')
      }}
    >
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((value) => (
          <ChoiceChip
            key={value}
            testID={`intake-experience-${value}`}
            label={t(OPTION_KEY[value])}
            selected={answers.experienceChoice === value}
            onPress={() => update({ experienceChoice: value })}
          />
        ))}
      </View>
      <OptionalNote
        question={t('intake.experience.noteQuestion')}
        value={answers.experienceText}
        onChangeText={(experienceText) => update({ experienceText })}
      />
    </StepScreen>
  )
}
