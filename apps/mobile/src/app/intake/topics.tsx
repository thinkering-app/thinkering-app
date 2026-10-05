import { router } from 'expo-router'
import { useEffect } from 'react'

import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/components/generation-error'
import { ChipPicker } from '@/intake/chip-picker'
import { StepScreen } from '@/intake/step-screen'

/**
 * Step 5 (docs/01 §1) — G2b's topic chips, plus any they add themselves. G2b
 * went out with G2 and had step 4 to finish, so this is normally ready on
 * arrival. Selecting none is allowed, and so is moving on when G2b failed. On
 * advance, G3 goes out; step 6 covers its wait.
 */
export default function TopicsStep() {
  const { answers, update, topics, startChoices, retryTopics, startPath } = useIntake()

  useEffect(() => {
    if (topics.status === 'idle') startChoices()
  }, [startChoices, topics.status])

  return (
    <StepScreen
      step={5}
      question="Which topics feel most relevant?"
      continueDisabled={topics.status === 'idle' || topics.status === 'pending'}
      onContinue={() => {
        startPath()
        router.push('/intake/time')
      }}
    >
      <ChipPicker
        testID="intake-topics"
        addLabel="Add your own"
        generated={topics.status === 'ready' ? topics.value.topics.map((t) => t.label) : []}
        custom={answers.customTopics}
        selected={answers.selectedTopics}
        onChange={({ custom, selected }) =>
          update({ customTopics: custom, selectedTopics: selected })
        }
      />
      {topics.status === 'error' ? (
        <GenerationError message={topics.message} onRetry={retryTopics} />
      ) : topics.status !== 'ready' ? (
        <Generating label="Finding topics" />
      ) : null}
    </StepScreen>
  )
}
