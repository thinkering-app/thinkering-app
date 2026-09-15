import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { GeneratedGoal } from '@thinkering/core'
import { moveGoal, softDeleteGoal, updateGoal, type Goal } from '@thinkering/db'

import { FeedbackButton } from '@/components/feedback-button'
import { GenerationError } from '@/components/generation-error'
import { Generating } from '@/components/generating'
import { repoContext, db } from '@/db'
import { InterestSelector } from '@/interests/selector'
import { GoalCard } from '@/path/goal-card'
import { GoalSheet } from '@/path/goal-sheet'
import { useSuggestions } from '@/path/suggestions'
import { usePath, usePathInterest } from '@/path/use-path'
import { colors } from '@/theme/tokens'

/**
 * Path (docs/01 §5): the interest's goals in path order with their status as a
 * colour treatment, expandable to the concepts beneath them, reorderable and
 * editable — and G9's three suggestions at the bottom.
 */
export default function PathScreen() {
  const interest = usePathInterest()
  const { goals, reload } = usePath(interest)
  const suggestions = useSuggestions(
    interest,
    goals.map((g) => g.goal),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [reordering, setReordering] = useState(false)

  const move = (goalId: string, to: number) => {
    moveGoal(db, repoContext, goalId, to)
    reload()
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="gap-4 px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-heading-bold text-display text-ink">Path</Text>
          <View className="flex-row items-center gap-5">
            {reordering ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setReordering(false)}
                hitSlop={10}
              >
                <Text className="font-sans-medium text-body text-cornflower-deep">Done</Text>
              </Pressable>
            ) : null}
            {interest ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Path settings"
                onPress={() => router.push(`/path/settings?interestId=${interest.id}`)}
                hitSlop={10}
              >
                <Ionicons name="options-outline" size={22} color={colors.ink.soft} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <InterestSelector allowAll={false} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 py-6">
        {!interest ? (
          <Empty />
        ) : (
          <>
            {goals.map((view, index) => (
              <GoalCard
                key={view.goal.id}
                view={view}
                expanded={expandedId === view.goal.id}
                onToggle={() => setExpandedId((id) => (id === view.goal.id ? null : view.goal.id))}
                onEdit={() => setEditing(view.goal)}
                onLongPress={() => setReordering(true)}
                onMoveUp={reordering && index > 0 ? () => move(view.goal.id, index - 1) : undefined}
                onMoveDown={
                  reordering && index < goals.length - 1
                    ? () => move(view.goal.id, index + 1)
                    : undefined
                }
              />
            ))}

            <View className="gap-3 pt-6">
              <Text className="font-heading-bold text-heading text-ink">Suggested</Text>
              {suggestions.error ? (
                <GenerationError message={suggestions.error} onRetry={suggestions.retry} />
              ) : suggestions.pending ? (
                <Generating label="Looking at your path" />
              ) : (
                suggestions.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.title}
                    suggestion={suggestion}
                    onAdd={() => {
                      suggestions.accept(suggestion)
                      reload()
                    }}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <GoalSheet
        key={editing?.id ?? 'none'}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        goal={editing}
        onSave={(draft) => {
          if (editing) updateGoal(db, repoContext, editing.id, draft)
          reload()
        }}
        onDelete={() => {
          if (editing) softDeleteGoal(db, repoContext, editing.id)
          reload()
        }}
      />
      <FeedbackButton />
    </SafeAreaView>
  )
}

function SuggestionCard({ suggestion, onAdd }: { suggestion: GeneratedGoal; onAdd: () => void }) {
  return (
    <View className="flex-row items-start gap-3 rounded-card border border-hairline bg-surface p-4">
      <View className="flex-1 gap-1">
        <Text className="font-heading text-body text-ink">{suggestion.title}</Text>
        <Text className="font-sans text-secondary text-ink-soft">{suggestion.description}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${suggestion.title} to your path`}
        onPress={onAdd}
        hitSlop={10}
      >
        <Ionicons name="add-circle-outline" size={24} color={colors.cornflower.DEFAULT} />
      </Pressable>
    </View>
  )
}

function Empty() {
  return (
    <View className="items-center gap-4 px-8 py-10">
      <Text className="text-center font-sans text-body text-ink-soft">
        Add something you want to learn to get started.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/intake/welcome')}
        className="rounded-pill bg-cornflower px-6 py-3 active:bg-cornflower-deep"
      >
        <Text className="font-sans-medium text-body text-white">Add an interest</Text>
      </Pressable>
    </View>
  )
}
