import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { isOverLimit, type WhyChoice } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { OptionalNote } from '@/intake/optional-note'
import { StepScreen } from '@/intake/step-screen'

const OPTION_KEY = {
  career: 'intake.why.options.career',
  personal_goal: 'intake.why.options.personalGoal',
  fun: 'intake.why.options.fun',
} as const satisfies Record<WhyChoice, string>

const OPTIONS: WhyChoice[] = ['career', 'personal_goal', 'fun']

/** Step 2 (docs/01 §1). On advance, G1 goes out — it has step 3 to finish. */
export default function WhyStep() {
  const { t } = useTranslation()
  const { answers, update, startApproach } = useIntake()

  return (
    <StepScreen
      step={2}
      question={t('intake.why.question')}
      continueDisabled={!answers.whyChoice || isOverLimit(answers.whyText, 'note')}
      onContinue={() => {
        startApproach()
        router.push('/intake/experience')
      }}
    >
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((value) => (
          <ChoiceChip
            key={value}
            testID={`intake-why-${value}`}
            label={t(OPTION_KEY[value])}
            selected={answers.whyChoice === value}
            onPress={() => update({ whyChoice: value })}
          />
        ))}
      </View>
      <OptionalNote
        question={t('intake.why.noteQuestion')}
        value={answers.whyText}
        onChangeText={(whyText) => update({ whyText })}
      />
    </StepScreen>
  )
}
