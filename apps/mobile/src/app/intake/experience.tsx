import { router } from 'expo-router'
import { View } from 'react-native'
import type { ExperienceChoice } from '@thinkering/core'

import { ChoiceChip } from '@/components/choice-chip'
import { useIntake } from '@/intake/context'
import { OptionalNote } from '@/intake/optional-note'
import { StepScreen } from '@/intake/step-screen'

const OPTIONS: { value: ExperienceChoice; label: string }[] = [
  { value: 'getting_started', label: 'Just getting started' },
  { value: 'explored', label: 'Explored a bit' },
  { value: 'in_middle', label: 'In the middle' },
  { value: 'experienced', label: 'Have a lot of experience' },
]

/** Step 3 (docs/01 §1). On advance, G2 goes out — it waits on G1 and has step 4 to finish. */
export default function ExperienceStep() {
  const { answers, update, startTopics } = useIntake()

  return (
    <StepScreen
      step={3}
      question="How much experience do you have?"
      continueDisabled={!answers.experienceChoice}
      onContinue={() => {
        startTopics()
        router.push('/intake/time')
      }}
    >
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <ChoiceChip
            key={option.value}
            testID={`intake-experience-${option.value}`}
            label={option.label}
            selected={answers.experienceChoice === option.value}
            onPress={() => update({ experienceChoice: option.value })}
          />
        ))}
      </View>
      <OptionalNote
        label="Anything more?"
        value={answers.experienceText}
        onChangeText={(experienceText) => update({ experienceText })}
      />
    </StepScreen>
  )
}
