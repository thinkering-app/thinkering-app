import { router } from 'expo-router'
import { useEffect } from 'react'

import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/components/generation-error'
import { ChipPicker } from '@/intake/chip-picker'
import { StepScreen } from '@/intake/step-screen'

/**
 * Step 4 (docs/01 §1) — the G2 chips, plus any they add themselves. Step 3 is
 * all G2 gets, so the branded generating state shows here when it's still on
 * the way. Selecting none is allowed.
 */
export default function TopicsStep() {
  const { answers, update, topics, startTopics, retryTopics } = useIntake()

  useEffect(() => {
    // Covers a cold entry (deep link, or an answer changed on the way back).
    if (topics.status === 'idle') startTopics()
  }, [startTopics, topics.status])

  return (
    <StepScreen
      step={4}
      question="Which topics feel most relevant?"
      continueDisabled={topics.status !== 'ready'}
      onContinue={() => router.push('/intake/success')}
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
