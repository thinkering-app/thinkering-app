import { isOverLimit } from '@thinkering/core'
import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { ChoiceChip } from '@/components/choice-chip'
import { TextField } from '@/components/text-field'
import { useIntake } from '@/intake/context'
import { sampleExamples } from '@/intake/examples'
import { StepScreen } from '@/intake/step-screen'

const QUESTION = "What's one thing you want to learn?"

/**
 * Step 1 (docs/01 §1) — free text, with a few tappable examples underneath.
 * It asks for one thing because everything typed here becomes a single path:
 * "Spanish, piano and chess" would get one path through all three. A first
 * interest also gets a line saying the rest can come later — under the field
 * rather than in the placeholder, so it's still there while they type.
 */
export default function LearnStep() {
  const { answers, update, hasInterest } = useIntake()
  const [examples] = useState(() => sampleExamples())
  const ready =
    answers.wantToLearn.trim().length > 0 && !isOverLimit(answers.wantToLearn, 'wantToLearn')

  return (
    <StepScreen
      step={1}
      question={QUESTION}
      continueDisabled={!ready}
      onContinue={() => router.push('/intake/why')}
    >
      <TextField
        testID="intake-learn"
        value={answers.wantToLearn}
        onChangeText={(wantToLearn) => update({ wantToLearn })}
        placeholder="Anything you're curious about"
        accessibilityLabel={QUESTION}
        multiline
        autoFocus
        limit="wantToLearn"
      />
      {hasInterest ? null : (
        <Text className="font-sans text-secondary text-ink-soft">You can add more later.</Text>
      )}
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
