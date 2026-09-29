import { isOverLimit } from '@thinkering/core'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { ChoiceChip } from '@/components/choice-chip'
import { TextField } from '@/components/text-field'
import { useIntake } from '@/intake/context'
import { sampleExamples } from '@/intake/examples'
import { StepScreen } from '@/intake/step-screen'

/** Step 1 (docs/01 §1) — free text, with a few tappable examples underneath. */
export default function LearnStep() {
  const { answers, update } = useIntake()
  const [examples] = useState(() => sampleExamples())
  const ready =
    answers.wantToLearn.trim().length > 0 && !isOverLimit(answers.wantToLearn, 'wantToLearn')

  return (
    <StepScreen
      step={1}
      question="What do you want to learn?"
      continueDisabled={!ready}
      onContinue={() => router.push('/intake/why')}
    >
      <TextField
        testID="intake-learn"
        value={answers.wantToLearn}
        onChangeText={(wantToLearn) => update({ wantToLearn })}
        placeholder="Anything you're curious about"
        accessibilityLabel="What do you want to learn?"
        multiline
        autoFocus
        limit="wantToLearn"
      />
      <View className="flex-row flex-wrap gap-2">
        {examples.map((example) => (
          <ChoiceChip
            key={example}
            label={example}
            variant="quiet"
            onPress={() => update({ wantToLearn: example })}
          />
        ))}
      </View>
    </StepScreen>
  )
}
