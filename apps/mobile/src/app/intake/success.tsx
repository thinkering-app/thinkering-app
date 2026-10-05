import { router } from 'expo-router'
import { useEffect } from 'react'

import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/components/generation-error'
import { ChipPicker } from '@/intake/chip-picker'
import { StepScreen } from '@/intake/step-screen'

/**
 * Step 4 (docs/01 §1) — what they're hoping for: G2's outcomes, plus any they
 * add themselves. Step 3 is all G2 gets, so the branded generating state shows
 * here when it's still on the way. Selecting none is allowed. G2b's topics for
 * step 5 went out at the same time and use this step to finish.
 */
export default function SuccessStep() {
  const { answers, update, success, startChoices, retryOutcomes } = useIntake()

  useEffect(() => {
    // Covers a cold entry (deep link, or an answer changed on the way back).
    if (success.status === 'idle') startChoices()
  }, [startChoices, success.status])

  return (
    <StepScreen
      step={4}
      question="What are you hoping for?"
      continueDisabled={success.status !== 'ready'}
      onContinue={() => router.push('/intake/topics')}
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
        <GenerationError message={success.message} onRetry={retryOutcomes} />
      ) : success.status !== 'ready' ? (
        <Generating label="Thinking it through" />
      ) : null}
    </StepScreen>
  )
}
