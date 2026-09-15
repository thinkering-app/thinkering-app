import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'

import { ChoiceChip } from '@/components/choice-chip'
import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/intake/generation-error'
import { StepScreen } from '@/intake/step-screen'

/**
 * Step 5 (docs/01 §1) — the G2 chips. Step 4 usually covers the wait; when it
 * hasn't, this is where the branded generating state shows. Selecting none is
 * allowed. On advance, G3 goes out and streams onto step 6.
 */
export default function TopicsStep() {
  const { answers, update, topics, startTopics, retryTopics, startPath } = useIntake()

  useEffect(() => {
    // Covers a cold entry (deep link, or an answer changed on the way back).
    if (topics.status === 'idle') startTopics()
  }, [startTopics, topics.status])

  const toggle = (label: string) => {
    const selected = answers.selectedTopics.includes(label)
    update({
      selectedTopics: selected
        ? answers.selectedTopics.filter((t) => t !== label)
        : [...answers.selectedTopics, label],
    })
  }

  return (
    <StepScreen
      step={5}
      question="Which topics feel most relevant?"
      continueDisabled={topics.status !== 'ready'}
      onContinue={() => {
        startPath()
        router.push('/intake/direction')
      }}
    >
      {topics.status === 'ready' ? (
        <View className="flex-row flex-wrap gap-2">
          {topics.value.topics.map((topic) => (
            <ChoiceChip
              key={topic.label}
              label={topic.label}
              selected={answers.selectedTopics.includes(topic.label)}
              onPress={() => toggle(topic.label)}
            />
          ))}
        </View>
      ) : topics.status === 'error' ? (
        <GenerationError message={topics.message} onRetry={retryTopics} />
      ) : (
        <Generating label="Finding topics" />
      )}
    </StepScreen>
  )
}
