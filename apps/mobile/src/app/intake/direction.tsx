import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Card } from '@/components/card'
import { Generating } from '@/components/generating'
import { useIntake } from '@/intake/context'
import { GenerationError } from '@/components/generation-error'
import { selectOnArrival } from '@/interests/selection'
import { PrimaryAction, StepScreen } from '@/intake/step-screen'
import { AUTO_SEED_RESOURCES, seedResources } from '@/resources/seed'
import { colors } from '@/theme/tokens'

/**
 * Step 7 (docs/01 §1) — the generated interest name and goals, filling in as G3
 * streams, plus where the interest landed (D15) with a one-tap override.
 */
const MODE_HINT = {
  focus: 'For things you want to make steady progress on.',
  exploring: "For things you're curious about, with no rush.",
} as const

export default function DirectionStep() {
  const { answers, update, path, partialPath, startPath, retryPath, placement, save } = useIntake()

  useEffect(() => {
    if (path.status === 'idle') startPath()
  }, [path.status, startPath])

  const ready = path.status === 'ready'
  const name = ready ? path.value.name : partialPath.name
  const goals = ready ? path.value.goals : partialPath.goals
  const mode = answers.statusOverride ?? placement

  const finish = () => {
    const interestId = save()
    // Today opens on the interest they just added, not the one they left.
    selectOnArrival(interestId)
    // Today plans the day and writes its cards ahead on arrival. G4 searches
    // for resources from here, fully in the background: nobody is waiting on
    // it, so a failure is silent and the resources simply don't appear. On the
    // web it doesn't run at all; there, resources are the links the learner
    // adds (AUTO_SEED_RESOURCES, FIND_MORE_ENABLED).
    if (AUTO_SEED_RESOURCES) {
      seedResources(interestId).catch((e: unknown) => {
        if (__DEV__) console.warn('[resources] seeding failed', e)
      })
    }
    router.replace('/today')
  }

  return (
    <StepScreen
      step={7}
      question="Here's a direction we can start with."
      footer={
        <PrimaryAction
          testID="intake-finish"
          label="Go to Today"
          onPress={finish}
          disabled={!ready}
        />
      }
    >
      {path.status === 'error' ? (
        <GenerationError message={path.message} onRetry={retryPath} />
      ) : (
        <View className="gap-6">
          <View className="gap-3">
            <Text className="font-sans text-secondary text-ink-soft">
              We&apos;ll keep evolving this as you go.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'focus' }}
              accessibilityLabel={`Mode: ${mode === 'focus' ? 'in focus' : 'exploring'}. Tap to switch.`}
              onPress={() => update({ statusOverride: mode === 'focus' ? 'exploring' : 'focus' })}
              className="flex-row items-center gap-2 self-start rounded-pill border border-hairline px-3 py-2 active:bg-cornflower-tint"
            >
              <Ionicons
                name={mode === 'focus' ? 'flag' : 'compass-outline'}
                size={15}
                color={mode === 'focus' ? colors.cornflower.deep : colors.ink.soft}
              />
              <Text className="font-sans text-secondary text-ink-soft">
                {mode === 'focus' ? 'In focus' : 'Exploring'}
              </Text>
            </Pressable>
            <Text className="font-sans text-secondary text-ink-soft">{MODE_HINT[mode]}</Text>
          </View>

          {name ? (
            <Text className="font-heading-bold text-display text-ink">{name}</Text>
          ) : (
            <Generating label="Putting a path together" />
          )}

          <View className="gap-3">
            {goals.map((goal) => (
              <Card key={goal.title}>
                <Text className="font-heading text-heading text-ink">{goal.title}</Text>
                <Text className="mt-1 font-sans text-secondary text-ink-soft">
                  {goal.description}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}
    </StepScreen>
  )
}
