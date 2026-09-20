import { router } from 'expo-router'
import { useEffect } from 'react'

import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/components/generation-error'
import { ChipPicker } from '@/intake/chip-picker'
import { StepScreen } from '@/intake/step-screen'

/**
 * Step 5 (docs/01 §1) — what they're hoping for: G2's outcomes, plus any they
 * add themselves. Step 4 already waited for the same call, so this is normally
 * ready on arrival. Selecting none is allowed, and so is moving on when G2
 * failed. On advance, G3 goes out; step 6 covers its wait.
 */
export default function SuccessStep() {
  const { answers, update, success, startChoices, retryChoices, startPath } = useIntake()

  useEffect(() => {
    if (success.status === 'idle') startChoices()
  }, [startChoices, success.status])

  return (
    <StepScreen
      step={5}
      question="What are you hoping for?"
      continueDisabled={success.status === 'idle' || success.status === 'pending'}
      onContinue={() => {
        startPath()
        router.push('/intake/time')
      }}
    >
      <ChipPicker
        testID="intake-success"
        addLabel="Add your own"
        generated={success.status === 'ready' ? success.value.outcomes : []}
        custom={answers.customOutcomes}
        selected={answers.selectedOutcomes}
        onChange={({ custom, selected }) =>
          update({ customOutcomes: custom, selectedOutcomes: selected })
        }
      />
      {success.status === 'error' ? (
        <GenerationError message={success.message} onRetry={retryChoices} />
      ) : success.status !== 'ready' ? (
        <Generating label="Thinking it through" />
      ) : null}
    </StepScreen>
  )
}
