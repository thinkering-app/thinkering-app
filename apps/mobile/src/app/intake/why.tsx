import { router } from 'expo-router'
import { View } from 'react-native'
import type { WhyChoice } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { OptionalNote } from '@/intake/optional-note'
import { StepScreen } from '@/intake/step-screen'

const OPTIONS: { value: WhyChoice; label: string }[] = [
  { value: 'career', label: 'For my career' },
  { value: 'personal_goal', label: 'For a personal goal' },
  { value: 'fun', label: 'For fun' },
]

/** Step 2 (docs/01 §1). On advance, G1 goes out — it has step 3 to finish. */
export default function WhyStep() {
  const { answers, update, startApproach } = useIntake()

  return (
    <StepScreen
      step={2}
      question="Why do you want to learn it?"
      continueDisabled={!answers.whyChoice}
      onContinue={() => {
        startApproach()
        router.push('/intake/experience')
      }}
    >
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <ChoiceChip
            key={option.value}
            testID={`intake-why-${option.value}`}
            label={option.label}
            selected={answers.whyChoice === option.value}
            onPress={() => update({ whyChoice: option.value })}
          />
        ))}
      </View>
      <OptionalNote
        question="What do you want to be able to do, and why?"
        value={answers.whyText}
        onChangeText={(whyText) => update({ whyText })}
      />
    </StepScreen>
  )
}
