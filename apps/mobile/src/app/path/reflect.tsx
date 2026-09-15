import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  acceptAddition,
  acceptProposal,
  addOwnGoal,
  dismissAddition,
  dismissProposal,
  draftChanges,
  goalRefs,
  moveDraft,
  planReflection,
  toggleRemoved,
  type DraftGoal,
  type ReflectionGoal,
  type ReflectionPlan,
  type ReflectUpdateOutput,
  type ReflectUpdateParams,
  type SuggestedAddition,
} from '@thinkering/core'
import {
  applyReflection,
  getInterest,
  listGoals,
  listTopics,
  uuidv7,
  type ReflectionEntry,
} from '@thinkering/db'

import { callAi, describeAiError } from '@/ai'
import { interestContext } from '@/ai/context'
import { Button } from '@/components/button'
import { GenerationError } from '@/components/generation-error'
import { Generating } from '@/components/generating'
import { TextField } from '@/components/text-field'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { colors } from '@/theme/tokens'

/**
 * The reflection flow (docs/01 §5): one question about how their learning
 * feels, then G8's proposed path edits, which they accept, dismiss or override
 * before the path is written.
 */
export default function ReflectScreen() {
  const { interestId } = useLocalSearchParams<{ interestId: string }>()
  const interest = interestId ? getInterest(db, interestId) : undefined
  // The path as it was when the flow opened: the refs G8 answers with are
  // positions in this list, so it must not shift underneath the review step.
  const [pathGoals] = useState(() => (interestId ? listGoals(db, interestId) : []))
  const goals: ReflectionGoal[] = pathGoals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
  }))

  const [feelingText, setFeelingText] = useState('')
  const [status, setStatus] = useState<'writing' | 'generating' | 'reviewing' | 'error'>('writing')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<ReflectionPlan | null>(null)
  const [ownGoal, setOwnGoal] = useState('')

  if (!interest) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-paper">
        <Text className="font-sans text-body text-ink-soft">That interest is gone.</Text>
      </SafeAreaView>
    )
  }

  const generate = async () => {
    setStatus('generating')
    try {
      const params: ReflectUpdateParams = {
        context: interestContext(interest),
        sessionMinutes: interest.sessionMinutes,
        feelingText: feelingText.trim(),
        goals: goalRefs(goals).map(({ ref, goal }, index) => ({
          ref,
          title: goal.title,
          description: goal.description,
          status: pathGoals[index]!.status,
        })),
        topics: listTopics(db, interest.id)
          .filter((t) => t.selected)
          .map((t) => t.label),
      }
      const { output } = await callAi<ReflectUpdateOutput>('reflect.update', params, {
        interestId: interest.id,
      })
      setPlan(planReflection(goals, output))
      setStatus('reviewing')
    } catch (e) {
      setError(describeAiError(e))
      setStatus('error')
    }
  }

  const apply = () => {
    if (!plan) return
    const entries: ReflectionEntry[] = plan.draft
      .filter((g) => !g.removed)
      .map((g) =>
        g.goalId
          ? { kind: 'existing', goalId: g.goalId, title: g.title, description: g.description }
          : {
              kind: 'new',
              title: g.title,
              description: g.description,
              concepts: g.concepts,
              source: g.source === 'user' ? 'user' : 'reflection',
            },
      )
    const changes = draftChanges(plan, goals)
    applyReflection(db, repoContext, {
      interestId: interest.id,
      feelingText: feelingText.trim(),
      entries,
      changes,
    })
    for (const entry of entries) {
      if (entry.kind === 'new') track('goal_added', { source: entry.source })
    }
    track('reflection_completed', {
      changes_count:
        changes.added.length +
        changes.removed.length +
        changes.revised.length +
        (changes.reordered ? 1 : 0),
    })
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-5 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text className="font-heading-bold text-title text-ink">Reflect</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {status === 'writing' ? (
          <>
            <Text className="font-heading text-heading text-ink">
              How is your learning going, and what do you want to focus on next?
            </Text>
            <TextField
              value={feelingText}
              onChangeText={setFeelingText}
              multiline
              autoFocus
              accessibilityLabel="How your learning is going"
            />
            <Button
              label="Continue"
              onPress={() => void generate()}
              disabled={feelingText.trim().length === 0}
            />
          </>
        ) : status === 'generating' ? (
          <Generating label="Looking at your path" />
        ) : status === 'error' ? (
          <GenerationError message={error} onRetry={() => void generate()} />
        ) : plan ? (
          <>
            <Text className="font-sans text-body text-ink">{plan.observations}</Text>

            <View className="gap-3 pt-2">
              {plan.draft.map((entry, index) => (
                <DraftRow
                  key={entry.key}
                  entry={entry}
                  onAccept={() => setPlan(acceptProposal(plan, entry.key))}
                  onDismiss={() => setPlan(dismissProposal(plan, entry.key))}
                  onToggleRemoved={() => setPlan(toggleRemoved(plan, entry.key))}
                  onUp={index > 0 ? () => setPlan(moveDraft(plan, entry.key, -1)) : undefined}
                  onDown={
                    index < plan.draft.length - 1
                      ? () => setPlan(moveDraft(plan, entry.key, 1))
                      : undefined
                  }
                />
              ))}
            </View>

            {plan.additions.length > 0 ? (
              <View className="gap-3 pt-4">
                <Text className="font-heading-bold text-heading text-ink">Worth adding</Text>
                {plan.additions.map((addition) => (
                  <AdditionRow
                    key={addition.key}
                    addition={addition}
                    onAdd={() => setPlan(acceptAddition(plan, addition.key))}
                    onDismiss={() => setPlan(dismissAddition(plan, addition.key))}
                  />
                ))}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2 pt-2">
              <View className="flex-1">
                <TextField
                  value={ownGoal}
                  onChangeText={setOwnGoal}
                  placeholder="Add a goal of your own"
                  accessibilityLabel="Add a goal of your own"
                />
              </View>
              <Button
                label="Add"
                variant="quiet"
                disabled={ownGoal.trim().length === 0}
                onPress={() => {
                  setPlan(addOwnGoal(plan, ownGoal.trim(), uuidv7()))
                  setOwnGoal('')
                }}
              />
            </View>

            <View className="pt-4">
              <Button label="Update path" onPress={apply} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function DraftRow({
  entry,
  onAccept,
  onDismiss,
  onToggleRemoved,
  onUp,
  onDown,
}: {
  entry: DraftGoal
  onAccept: () => void
  onDismiss: () => void
  onToggleRemoved: () => void
  onUp?: () => void
  onDown?: () => void
}) {
  return (
    <View
      className={`gap-2 rounded-card border p-4 ${
        entry.removed ? 'border-hairline bg-paper' : 'border-hairline bg-surface'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <Text
            className={`font-heading text-body ${entry.removed ? 'text-ink-soft line-through' : 'text-ink'}`}
          >
            {entry.title}
          </Text>
          {entry.goalId === null ? (
            <Text className="font-sans text-caption text-cornflower-deep">New</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-3">
          <IconAction name="chevron-up" label={`Move ${entry.title} up`} onPress={onUp} />
          <IconAction name="chevron-down" label={`Move ${entry.title} down`} onPress={onDown} />
          <IconAction
            name={entry.removed ? 'arrow-undo-outline' : 'close'}
            label={entry.removed ? `Keep ${entry.title}` : `Remove ${entry.title}`}
            onPress={onToggleRemoved}
          />
        </View>
      </View>

      {entry.proposal ? (
        <View className="gap-2 rounded-card bg-cornflower-tint p-3">
          <Text className="font-sans text-secondary text-ink">
            {entry.proposal.kind === 'revise'
              ? `Reword as "${entry.proposal.title}" — ${entry.proposal.reason}`
              : entry.proposal.kind === 'remove'
                ? `Drop this — ${entry.proposal.reason}`
                : `Move this — ${entry.proposal.reason}`}
          </Text>
          <View className="flex-row gap-2">
            <Button label="Accept" variant="quiet" onPress={onAccept} />
            <Button label="Leave it" variant="quiet" onPress={onDismiss} />
          </View>
        </View>
      ) : null}
    </View>
  )
}

function AdditionRow({
  addition,
  onAdd,
  onDismiss,
}: {
  addition: SuggestedAddition
  onAdd: () => void
  onDismiss: () => void
}) {
  return (
    <View className="gap-2 rounded-card border border-hairline bg-surface p-4">
      <Text className="font-heading text-body text-ink">{addition.title}</Text>
      <Text className="font-sans text-secondary text-ink-soft">{addition.description}</Text>
      <Text className="font-sans text-caption text-ink-soft">{addition.reason}</Text>
      <View className="flex-row gap-2">
        <Button label="Add" variant="quiet" onPress={onAdd} />
        <Button label="Not now" variant="quiet" onPress={onDismiss} />
      </View>
    </View>
  )
}

function IconAction({
  name,
  label,
  onPress,
}: {
  name: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={8}
      className={onPress ? '' : 'opacity-30'}
    >
      <Ionicons name={name} size={18} color={colors.ink.soft} />
    </Pressable>
  )
}
