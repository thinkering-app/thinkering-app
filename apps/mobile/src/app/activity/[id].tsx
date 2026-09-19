import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  durationBucket,
  insertPageAfter,
  lastInteractivePageIndex,
  parseResponsePayload,
  reviewPageIndex,
  type ActivityDoc,
  type Block,
  type PartialActivityDoc,
  type Rating,
  type ResponsePayload,
} from '@thinkering/core'
import {
  attachDoc,
  completeActivity,
  countCompletedActivities,
  getActivity,
  getGoal,
  listResponses,
  rateActivity,
  saveProgress,
  saveResponse,
  startActivity,
  type Activity,
} from '@thinkering/db'

import { describeAiError } from '@/ai/generation'
import { AnalyticsAskSheet, shouldAskForAnalytics, track } from '@/analytics'
import { Button } from '@/components/button'
import { GenerationError } from '@/components/generation-error'
import { db, repoContext } from '@/db'
import { AskSheet } from '@/features/activity-player/ask-sheet'
import {
  fallbackReviewPage,
  generateActivityDoc,
  generateAskPage,
  generateReviewPage,
} from '@/features/activity-player/generate'
import { ActivityPlayer } from '@/features/activity-player/player'
import type { ResponseSink } from '@/features/activity-player/responses'
import { postActivityReport, type ActivityReport } from '@/feedback/client'
import { useFeedbackContext } from '@/feedback/context'

/**
 * Playing one activity (docs/05). The route owns everything durable — the
 * document as G5b streams it in, responses, the resume point, the rating,
 * completion — and the player owns the rendering.
 */

/** How long the review page waits on G6 before falling back to a plain recap (docs/04). */
const REVIEW_PATIENCE_MS = 5_000

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activity] = useState(() => (id ? getActivity(db, id) : undefined))
  // The prerequisite-fallback card has no goal; its topic stands in, as on Today.
  const [goalTitle] = useState(() =>
    activity?.goalId ? getGoal(db, activity.goalId)?.title : (activity?.topic ?? undefined),
  )
  const [doc, setDoc] = useState<ActivityDoc | null>(activity?.doc ?? null)
  const [partial, setPartial] = useState<PartialActivityDoc | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(activity?.currentPage ?? 0)
  const [rating, setRating] = useState<Rating | null>(activity?.rating ?? null)
  const [ratingText, setRatingText] = useState(activity?.ratingText ?? '')
  const [shareState, setShareState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [askOpen, setAskOpen] = useState(false)
  const [askState, setAskState] = useState<'idle' | 'pending' | 'error'>('idle')
  const [askError, setAskError] = useState<string>()
  const [askConsent, setAskConsent] = useState(false)
  const reviewRequested = useRef(false)
  const openedAt = useRef(0)
  const questionsAsked = useRef(0)
  const completed = useRef(false)
  const feedbackContext = useFeedbackContext()

  const sink = useMemo((): ResponseSink => {
    const answers: Record<string, ResponsePayload> = {}
    if (!activity) return { initial: answers, save: () => {} }
    for (const row of listResponses(db, activity.id)) {
      const payload = parseResponsePayload(row.payload)
      if (payload) answers[row.blockId] = payload
    }
    return {
      initial: answers,
      save: (pageId, blockId, payload) => {
        saveResponse(db, repoContext, { activityId: activity.id, pageId, blockId, payload })
      },
    }
  }, [activity])

  // Opening a card starts it (docs/03: started_at once, status in_progress).
  useEffect(() => {
    if (!activity) return
    startActivity(db, repoContext, activity.id)
    openedAt.current = Date.now()
    track('activity_started', {
      section: activity.section,
      tier: activity.tier,
      library_item_id: activity.libraryItemId,
      source: activity.startedAt === null ? 'card' : 'resume',
    })
  }, [activity])

  // G5b on first open of a card that has no document yet (docs/04: streamed,
  // page 1 renders as soon as it parses). If the Next-card prefetch is still
  // writing it, this joins that generation rather than starting another.
  useEffect(() => {
    if (!activity || activity.doc) return
    const controller = new AbortController()
    const run = async () => {
      setGenError(null)
      setPartial(null)
      try {
        setDoc(
          await generateActivityDoc(activity, { signal: controller.signal, onPartial: setPartial }),
        )
      } catch (e) {
        if (!controller.signal.aborted) setGenError(describeAiError(e))
      }
    }
    void run()
    return () => controller.abort()
  }, [activity, attempt])

  /** G6, once they move past the last page that asked them anything. */
  const maybeGenerateReview = useCallback(
    (next: number, current: ActivityDoc) => {
      if (reviewRequested.current) return
      const review = reviewPageIndex(current)
      if (review === -1 || current.pages[review]?.blocks !== null) return
      if (next <= lastInteractivePageIndex(current)) return
      reviewRequested.current = true
      generateReviewPage(activity!, current)
        .then(setDoc)
        .catch(() => setDoc(fallbackReviewPage(activity!, current)))
    },
    [activity],
  )

  const changePage = useCallback(
    (next: number) => {
      setPage(next)
      if (activity) saveProgress(db, repoContext, activity.id, next)
      if (doc) maybeGenerateReview(next, doc)
    },
    [activity, doc, maybeGenerateReview],
  )

  // If G6 is slow or failed, the review page becomes a plain recap rather than
  // sitting empty (docs/04 §Failure handling).
  useEffect(() => {
    if (!activity || !doc) return
    const review = reviewPageIndex(doc)
    if (review !== page || doc.pages[review]?.blocks !== null) return
    const timer = setTimeout(() => {
      setDoc((prev) => (prev ? fallbackReviewPage(activity, prev) : prev))
    }, REVIEW_PATIENCE_MS)
    return () => clearTimeout(timer)
  }, [activity, doc, page])

  /** G7: the answer streams into a page inserted after the current one. */
  const ask = useCallback(
    (question: string) => {
      if (!activity || !doc) return
      setAskState('pending')
      questionsAsked.current += 1
      track('question_asked', { tier: activity.tier })
      let insertedId: string | null = null
      const applyBlocks = (blocks: Block[]) => {
        if (blocks.length === 0) return
        setDoc((prev) => {
          if (!prev) return prev
          if (insertedId === null) {
            insertedId = repoContext.newId()
            return insertPageAfter(prev, page, { id: insertedId, kind: 'inserted', blocks })
          }
          return {
            ...prev,
            pages: prev.pages.map((p) => (p.id === insertedId ? { ...p, blocks } : p)),
          }
        })
        if (insertedId !== null) {
          setAskOpen(false)
          setAskState('idle')
          changePage(page + 1)
        }
      }

      generateAskPage(activity, doc, page, question, { onPartial: applyBlocks })
        .then((blocks) => {
          applyBlocks(blocks)
          setDoc((prev) => {
            if (prev) attachDoc(db, repoContext, activity.id, prev)
            return prev
          })
        })
        .catch((e: unknown) => {
          setAskState('error')
          setAskError(describeAiError(e))
        })
    },
    [activity, changePage, doc, page],
  )

  const onShare = useCallback(
    (comment: string) => {
      if (!activity || !doc) return
      setShareState('pending')
      // Their answers never travel with a report — only what they chose to
      // write here (docs/08 §Activity quality review).
      const report: ActivityReport = {
        title: activity.title,
        libraryItemId: activity.libraryItemId,
        tier: activity.tier,
        rating,
        comment,
        doc,
      }
      postActivityReport(report, feedbackContext)
        .then(() => {
          track('activity_report_sent')
          setShareState('done')
        })
        .catch(() => setShareState('error'))
    },
    [activity, doc, feedbackContext, rating],
  )

  if (!activity) return <Missing message="This activity is no longer here." />
  // A document that failed to generate doesn't get to look like one that
  // half-arrived: the partial pages go with it.
  if (genError && !doc) {
    return (
      <Missing>
        <GenerationError message={genError} onRetry={() => setAttempt((n) => n + 1)} />
      </Missing>
    )
  }
  const shown = doc ?? provisionalDoc(activity, partial)

  return (
    <ActivityPlayer
      doc={shown}
      goalTitle={goalTitle}
      streaming={doc === null}
      // Before any text, the model is still working out the activity (docs/04
      // §Thinking); once it writes, the title and pages follow.
      waitLabel={partial === null ? 'Planning your activity' : 'Writing your activity'}
      sink={sink}
      page={page}
      onPageChange={changePage}
      rating={rating}
      ratingText={ratingText}
      onRate={(next, text) => {
        setRating(next)
        setRatingText(text)
        rateActivity(db, repoContext, activity.id, next, text)
      }}
      onDone={() => {
        completeActivity(db, repoContext, activity.id)
        completed.current = true
        track('activity_completed', {
          section: activity.section,
          tier: activity.tier,
          library_item_id: activity.libraryItemId,
          duration_bucket: durationBucket(Date.now() - (activity.startedAt ?? openedAt.current)),
          pages: shown.pages.length,
          questions_asked_count: questionsAsked.current,
          rating: rating ?? 'none',
        })
        // The one-time analytics ask rides on the first completion (docs/08).
        if (shouldAskForAnalytics(countCompletedActivities(db))) setAskConsent(true)
        else router.back()
      }}
      onClose={() => {
        if (!completed.current) {
          track('activity_abandoned', { tier: activity.tier, last_page_index: page })
        }
        router.back()
      }}
      onShare={onShare}
      shareState={shareState}
      onAsk={doc ? () => setAskOpen(true) : undefined}
      overlay={
        <>
          <AskSheet
            visible={askOpen}
            onClose={() => {
              setAskOpen(false)
              setAskState('idle')
            }}
            onAsk={ask}
            state={askState}
            error={askError}
          />
          <AnalyticsAskSheet
            visible={askConsent}
            onAnswered={() => {
              setAskConsent(false)
              router.back()
            }}
          />
        </>
      }
    />
  )
}

/**
 * What the player renders while G5b is still writing: the pages that have
 * closed so far (docs/04 §Latency), and before the first one, none — the
 * player's frame with the wait inside it. Concepts arrive with the finished
 * document — only the summary page needs them, and that's the last page.
 */
function provisionalDoc(activity: Activity, partial: PartialActivityDoc | null): ActivityDoc {
  return {
    version: 1,
    title: partial?.title ?? activity.title,
    estMinutes: partial?.estMinutes ?? activity.estMinutes,
    tier: activity.tier,
    libraryItemId: activity.libraryItemId,
    concepts: [],
    pages: partial?.pages ?? [],
  }
}

function Missing({ message, children }: { message?: string; children?: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 items-center justify-center gap-4 px-8">
        {message ? (
          <>
            <Text className="text-center font-sans text-body text-ink-soft">{message}</Text>
            <Button label="Back" variant="quiet" onPress={() => router.back()} />
          </>
        ) : (
          children
        )}
      </View>
    </SafeAreaView>
  )
}
