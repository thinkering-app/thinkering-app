import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { GeneratedGoal } from '@thinkering/core'
import {
  createGoal,
  moveGoal,
  nextGoalSortOrder,
  softDeleteGoal,
  updateGoal,
  type Goal,
} from '@thinkering/db'

import { track } from '@/analytics'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { FeedbackButton } from '@/components/feedback-button'
import { GenerationError } from '@/components/generation-error'
import { SettingsButton } from '@/components/settings-button'
import { Generating } from '@/components/generating'
import { repoContext, db } from '@/db'
import { useAddInterest } from '@/intake/add-interest'
import { InterestSelector } from '@/interests/selector'
import { GoalCard } from '@/path/goal-card'
import { GoalSheet } from '@/path/goal-sheet'
import { PathButtons } from '@/path/path-buttons'
import { ReflectCard } from '@/path/reflect-card'
import { useSuggestions } from '@/path/suggestions'
import { usePath, usePathInterest, type PathView } from '@/path/use-path'

/**
 * Path (docs/01 §5): the interest's goals in path order with their status as a
 * colour treatment, expandable to the concepts beneath them, reorderable and
 * editable, with a way to add a goal of their own — then G9's three
 * suggestions, collapsed to their titles, and the way into a reflection.
 */
export default function PathScreen() {
  const interest = usePathInterest()
  const { goals, progress, reload } = usePath(interest)
  const suggestions = useSuggestions(
    interest,
    goals.map((g) => g.goal),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
            {interest ? <PathButtons interestId={interest.id} /> : null}
            <SettingsButton />
          </View>
        </View>
        <InterestSelector allowAll={false} />
      </View>

      {/* Bottom room so the last card clears the feedback button. */}
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-24 pt-6">
        {!interest ? (
          <Empty />
        ) : (
          <>
            <Text className="font-heading-bold text-heading text-ink">My goals</Text>
            {goals.map((view, index) => (
              <GoalCard
                key={view.goal.id}
                view={view}
                expanded={expandedId === view.goal.id}
                onToggle={() => setExpandedId((id) => (id === view.goal.id ? null : view.goal.id))}
                onEdit={() => {
                  setEditing(view.goal)
                  setSheetOpen(true)
                }}
                onLongPress={() => setReordering(true)}
                onMoveUp={reordering && index > 0 ? () => move(view.goal.id, index - 1) : undefined}
                onMoveDown={
                  reordering && index < goals.length - 1
                    ? () => move(view.goal.id, index + 1)
                    : undefined
                }
              />
            ))}
            <Button
              label="Add a goal"
              variant="quiet"
              onPress={() => {
                setEditing(null)
                setSheetOpen(true)
              }}
            />
            <ProgressLine progress={progress} />

            <View className="gap-3 pt-6">
              <Text className="font-heading-bold text-heading text-ink">Suggested goals</Text>
              {suggestions.error ? (
                <GenerationError message={suggestions.error} onRetry={suggestions.retry} />
              ) : suggestions.pending ? (
                <Generating label="Looking at your path" />
              ) : (
                suggestions.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.title}
                    suggestion={suggestion}
                    expanded={expandedSuggestion === suggestion.title}
                    onToggle={() =>
                      setExpandedSuggestion((title) =>
                        title === suggestion.title ? null : suggestion.title,
                      )
                    }
                    onAdd={() => {
                      suggestions.accept(suggestion)
                      reload()
                    }}
                  />
                ))
              )}
            </View>

            <View className="pt-6">
              <ReflectCard interestId={interest.id} />
            </View>
          </>
        )}
      </ScrollView>

      <GoalSheet
        key={sheetOpen ? (editing?.id ?? 'new') : 'closed'}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        goal={editing}
        onSave={(draft) => {
          if (editing) {
            updateGoal(db, repoContext, editing.id, draft)
          } else if (interest) {
            createGoal(db, repoContext, {
              interestId: interest.id,
              ...draft,
              concepts: [],
              sortOrder: nextGoalSortOrder(db, interest.id),
              source: 'user',
            })
            track('goal_added', { source: 'user' })
          }
          reload()
        }}
        onDelete={
          editing
            ? () => {
                softDeleteGoal(db, repoContext, editing.id)
                reload()
              }
            : undefined
        }
      />
      <FeedbackButton />
    </SafeAreaView>
  )
}

/**
 * A G9 suggestion, collapsed to its title like a goal; tapping shows why it's
 * suggested. Add is the same quiet button the reflection's additions use.
 */
function SuggestionCard({
  suggestion,
  expanded,
  onToggle,
  onAdd,
}: {
  suggestion: GeneratedGoal
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggestion.title}
      accessibilityState={{ expanded }}
      onPress={onToggle}
      className="gap-2 rounded-card border border-hairline bg-surface py-2 pl-4 pr-2"
    >
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 py-2 font-heading text-body text-ink">{suggestion.title}</Text>
        <Button
          label="Add"
          variant="quiet"
          accessibilityLabel={`Add ${suggestion.title} to your path`}
          onPress={onAdd}
        />
      </View>
      {expanded ? (
        <Text className="pb-2 pr-2 font-sans text-secondary text-ink-soft">
          {suggestion.description}
        </Text>
      ) : null}
    </Pressable>
  )
}

/**
 * A quiet footnote to the goals (docs/01 §5): how far they've come and how
 * many activities it took. No totals, so a goal added later never reads as
 * ground lost, and nothing at all before the first completed activity.
 */
function ProgressLine({ progress }: { progress: PathView['progress'] }) {
  if (progress.activities === 0) return null
  const statuses = [
    progress.introduced > 0 ? `${progress.introduced} introduced` : null,
    progress.strengthened > 0 ? `${progress.strengthened} strengthened` : null,
    progress.applied > 0 ? `${progress.applied} put to use` : null,
  ].filter((part) => part !== null)
  return (
    <View className="items-center gap-0.5 pt-2">
      {statuses.length > 0 ? (
        <Text className="font-sans text-caption text-ink-soft">{statuses.join(' · ')}</Text>
      ) : null}
      <Text className="font-sans text-caption text-ink-soft">
        {progress.activities} {progress.activities === 1 ? 'activity' : 'activities'} completed
      </Text>
    </View>
  )
}

function Empty() {
  const { addInterest, resumeSheet } = useAddInterest()
  return (
    <EmptyState message="Add something you want to learn to get started.">
      <Button label="Add an interest" onPress={addInterest} />
      {resumeSheet}
    </EmptyState>
  )
}
