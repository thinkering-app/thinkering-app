import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Section } from '@thinkering/core'

import { ActivityCard } from '@/components/activity-card'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { FeedbackButton } from '@/components/feedback-button'
import { GenerationError } from '@/components/generation-error'
import { Generating } from '@/components/generating'
import { SectionHeader } from '@/components/section-header'
import { InterestSelector } from '@/interests/selector'
import { ReflectCard } from '@/path/reflect-card'
import { useInterestSelection } from '@/interests/selection'
import { ConfigureSheet } from '@/today/configure-sheet'
import { dropUntouchedCards } from '@/today/plan'
import { RoutineSheet } from '@/today/routine-sheet'
import { useToday, type TodaySectionView } from '@/today/use-today'

/**
 * Today (docs/01 §3): three sections of swipeable cards for the selected
 * interest, each configurable, with the routine question at the bottom.
 */
export default function TodayScreen() {
  const { selected, selection } = useInterestSelection()
  const { today, sections, reflect, empty, generating, error, retry, refresh } = useToday(selected)
  const [configuring, setConfiguring] = useState<Section | null>(null)
  const [routineOpen, setRoutineOpen] = useState(false)

  // Configuring is per-interest, so it needs a single interest in view.
  const configurable = selected.length === 1 ? selected[0]! : null

  const onConfigured = (section?: Section) => {
    if (configurable) dropUntouchedCards(configurable.id, today, section)
    refresh()
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="gap-4 px-5 pt-4">
        <Text className="font-heading-bold text-display text-ink">Today</Text>
        <InterestSelector />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 py-6">
        {error ? (
          <GenerationError message={error} onRetry={retry} />
        ) : empty && !generating ? (
          <Empty hasInterest={selection !== null} />
        ) : (
          sections.map((section) => (
            <View key={section.section} className="gap-3">
              <SectionRow
                view={section}
                generating={generating}
                onConfigure={configurable ? () => setConfiguring(section.section) : undefined}
              />
              {section.section === 'next' && reflect.length > 0 ? (
                <View className="gap-3 px-5">
                  {reflect.map((prompt) => (
                    <ReflectCard
                      key={prompt.interestId}
                      interestId={prompt.interestId}
                      interestName={prompt.interestName}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}

        {configurable ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setRoutineOpen(true)}
            className="items-center self-center rounded-pill px-5 py-3 active:bg-cornflower-tint"
          >
            <Text className="font-sans-medium text-secondary text-ink-soft">
              Configure learning routine
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {configurable ? (
        <>
          <ConfigureSheet
            visible={configuring !== null}
            onClose={() => setConfiguring(null)}
            interestId={configurable.id}
            section={configuring ?? 'next'}
            onChanged={onConfigured}
          />
          <RoutineSheet
            visible={routineOpen}
            onClose={() => setRoutineOpen(false)}
            interestId={configurable.id}
            onChanged={() => onConfigured()}
          />
        </>
      ) : null}
      <FeedbackButton />
    </SafeAreaView>
  )
}

function SectionRow({
  view,
  generating,
  onConfigure,
}: {
  view: TodaySectionView
  generating: boolean
  onConfigure?: () => void
}) {
  return (
    <View className="gap-3">
      <View className="px-3">
        <SectionHeader
          section={view.section}
          completedToday={view.completedToday}
          onConfigure={onConfigure}
        />
      </View>
      {view.cards.length === 0 && generating ? (
        <Generating label="Picking today's activities" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={300}
          contentContainerClassName="gap-3 px-5"
        >
          {view.cards.map((card, index) => (
            <ActivityCard
              key={card.activity.id}
              // Position, not activity id: a flow wants "the second Strengthen
              // card", and the id is a fresh UUID on every run. Sharing one id
              // across a section made the selector ambiguous.
              testID={`activity-card-${view.section}-${index}`}
              title={card.activity.title}
              goalLine={card.goalLine}
              estMinutes={card.activity.estMinutes}
              section={view.section}
              completed={card.activity.status === 'completed'}
              inProgress={card.activity.status === 'in_progress'}
              interestName={card.interestName}
              onPress={() => router.push(`/activity/${card.activity.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

function Empty({ hasInterest }: { hasInterest: boolean }) {
  return (
    <EmptyState
      message={
        hasInterest
          ? 'This interest has no goals yet.'
          : 'Add something you want to learn to get started.'
      }
    >
      {hasInterest ? null : (
        <Button label="Add an interest" onPress={() => router.push('/intake/welcome')} />
      )}
    </EmptyState>
  )
}
