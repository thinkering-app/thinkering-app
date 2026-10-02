import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Section } from '@thinkering/core'
import { getGoal } from '@thinkering/db'

import { describeAiError } from '@/ai'
import { ActivityCard } from '@/components/activity-card'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { FeedbackButton } from '@/components/feedback-button'
import { GenerationError } from '@/components/generation-error'
import { Generating } from '@/components/generating'
import { PressScale } from '@/components/press-scale'
import { SECTION_LABEL_KEY, SectionHeader } from '@/components/section-header'
import { SettingsButton } from '@/components/settings-button'
import { Toast } from '@/components/toast'
import { db } from '@/db'
import { writeActivityDoc, type WritingDocs } from '@/features/activity-player/generate'
import { useAddInterest } from '@/intake/add-interest'
import { InterestSelector } from '@/interests/selector'
import { PathButtons } from '@/path/path-buttons'
import { ReflectCard } from '@/path/reflect-card'
import { useInterestSelection } from '@/interests/selection'
import { ConfigureSheet } from '@/today/configure-sheet'
import { dropUntouchedCards, requestActivity, type ActivityRequest } from '@/today/plan'
import { RequestSheet } from '@/today/request-sheet'
import { RoutineSheet } from '@/today/routine-sheet'
import { useToday, type TodaySectionView } from '@/today/use-today'
import { colors } from '@/theme/tokens'

/** A + request whose card G5a is still planning — shown in its section meanwhile. */
interface Draft {
  id: number
  section: Section
  title: string
  goalLine: string
}

/**
 * Today (docs/01 §3): three sections of swipeable cards for the selected
 * interest, each configurable and each ending in a + card, with the routine
 * question at the bottom.
 */
export default function TodayScreen() {
  const { t } = useTranslation()
  const { selected, selection } = useInterestSelection()
  const exploreAll = selection?.kind === 'explore' && selection.interestId === null
  const { today, sections, reflect, empty, generating, writing, error, retry, refresh } = useToday(
    selected,
    { suggestOnly: exploreAll },
  )
  const [configuring, setConfiguring] = useState<Section | null>(null)
  const [routineOpen, setRoutineOpen] = useState(false)
  // Kept apart from the open flag so the sheet still shows its section while it slides away.
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestSection, setRequestSection] = useState<Section>('next')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const draftSeq = useRef(0)

  // Configuring is per-interest, so it needs a single interest in view.
  const configurable = selected.length === 1 ? selected[0]! : null

  const onConfigured = (section?: Section) => {
    if (configurable) dropUntouchedCards(configurable.id, section)
    refresh()
  }

  // A write the learner asked for says why it failed; the card goes back to Write.
  const onWriteFailed = (e: unknown) => setToast(describeAiError(e))

  const onRequest = async (request: ActivityRequest) => {
    if (!configurable) return
    const interest = configurable
    const goal = request.goalId ? getGoal(db, request.goalId) : undefined
    const focus = request.focus.trim()
    const draft: Draft = {
      id: ++draftSeq.current,
      section: request.section,
      title: focus || goal?.title || t('today.draft.newActivity'),
      goalLine: focus ? (goal?.title ?? '') : '',
    }
    setDrafts((current) => [...current, draft])
    try {
      const activity = await requestActivity(interest, today, request)
      // Asked for, so likely to be opened next: written straight away rather
      // than queued behind the day's other cards.
      writeActivityDoc(activity).promise.catch(onWriteFailed)
    } catch (e) {
      setToast(describeAiError(e))
    } finally {
      setDrafts((current) => current.filter((d) => d.id !== draft.id))
      refresh()
    }
  }

  const hasCards = sections.some((section) => section.cards.length > 0)

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="gap-4 px-5 pt-4">
        <View className="flex-row items-center gap-5">
          <Text className="flex-1 font-heading-bold text-display text-ink">{t('today.title')}</Text>
          {configurable ? <PathButtons interestId={configurable.id} /> : null}
          <SettingsButton />
        </View>
        <InterestSelector />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 py-6">
        {/* A failed top-up after a finished card leaves the rest of Today in place. */}
        {error ? <GenerationError message={error} onRetry={retry} /> : null}
        {error && !hasCards ? null : empty && !generating ? (
          <Empty hasInterest={selection !== null} exploreAll={exploreAll} />
        ) : (
          sections.map((section) => (
            <View key={section.section} className="gap-3">
              <SectionRow
                view={section}
                interestKey={selected.map((i) => i.id).join(',')}
                generating={generating}
                writing={writing}
                drafts={drafts.filter((d) => d.section === section.section)}
                onWriteFailed={onWriteFailed}
                onConfigure={configurable ? () => setConfiguring(section.section) : undefined}
                onAdd={
                  configurable
                    ? () => {
                        setRequestSection(section.section)
                        setRequestOpen(true)
                      }
                    : undefined
                }
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
              {t('today.routine.configure')}
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
          <RequestSheet
            visible={requestOpen}
            onClose={() => setRequestOpen(false)}
            interestId={configurable.id}
            section={requestSection}
            today={today}
            onRequest={(request) => void onRequest(request)}
          />
        </>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
      <FeedbackButton />
    </SafeAreaView>
  )
}

function SectionRow({
  view,
  interestKey,
  generating,
  writing,
  drafts,
  onWriteFailed,
  onConfigure,
  onAdd,
}: {
  view: TodaySectionView
  /** Another interest selected: the heading's check appears without popping. */
  interestKey: string
  generating: boolean
  /** Cards whose documents are still being written, and which of them can be opened. */
  writing: WritingDocs
  drafts: Draft[]
  onWriteFailed: (e: unknown) => void
  onConfigure?: () => void
  onAdd?: () => void
}) {
  const { t } = useTranslation()
  const unwritten = (card: TodaySectionView['cards'][number]) =>
    card.activity.status === 'planned' &&
    card.activity.doc === null &&
    !writing.ids.has(card.activity.id)
  return (
    <View className="gap-3">
      <View className="px-3">
        <SectionHeader
          section={view.section}
          completedToday={view.completedToday}
          resetKey={interestKey}
          onConfigure={onConfigure}
        />
      </View>
      {view.cards.length === 0 && generating ? (
        <Generating label={t('today.generating')} />
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
              // Page 1 in hand is enough to open: the card offers its time,
              // and the player picks the stream up from there.
              writing={writing.ids.has(card.activity.id) && !writing.ready.has(card.activity.id)}
              unwritten={unwritten(card)}
              interestName={card.interestName}
              onPress={() =>
                // A suggestion is written on request and stays put; once
                // written, a tap opens it.
                unwritten(card)
                  ? writeActivityDoc(card.activity).promise.catch(onWriteFailed)
                  : router.push(`/activity/${card.activity.id}`)
              }
            />
          ))}
          {drafts.map((draft) => (
            <ActivityCard
              key={`draft-${draft.id}`}
              title={draft.title}
              goalLine={draft.goalLine}
              estMinutes={0}
              section={view.section}
              writing
            />
          ))}
          {onAdd ? <AddCard section={view.section} onPress={onAdd} /> : null}
        </ScrollView>
      )}
    </View>
  )
}

/** The + at the end of a section's row: one more activity, on request. */
function AddCard({ section, onPress }: { section: Section; onPress: () => void }) {
  const { t } = useTranslation()
  return (
    <PressScale
      testID={`add-activity-${section}`}
      accessibilityRole="button"
      accessibilityLabel={t('today.request.createTitle', {
        section: t(SECTION_LABEL_KEY[section]),
      })}
      onPress={onPress}
      wrapperClassName="w-20 min-h-36"
      className="items-center justify-center rounded-card border border-dashed border-outline/35"
    >
      <Ionicons name="add" size={26} color={colors.ink.soft} />
    </PressScale>
  )
}

function Empty({ hasInterest, exploreAll }: { hasInterest: boolean; exploreAll: boolean }) {
  const { t } = useTranslation()
  const { addInterest, resumeSheet } = useAddInterest()
  return (
    <EmptyState
      message={
        !hasInterest
          ? t('today.empty.noInterest')
          : exploreAll
            ? t('today.empty.exploreAllNoGoals')
            : t('today.empty.noGoals')
      }
    >
      {hasInterest ? null : (
        <>
          <Button label={t('common.addInterest')} onPress={addInterest} />
          {resumeSheet}
        </>
      )}
    </EmptyState>
  )
}
