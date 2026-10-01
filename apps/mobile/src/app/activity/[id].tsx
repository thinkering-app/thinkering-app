import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  docForReport,
  durationBucket,
  fillReviewPage,
  getLibraryItem,
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
import { track } from '@/analytics'
import { Button } from '@/components/button'
import { GenerationError } from '@/components/generation-error'
import { db, repoContext } from '@/db'
import { AskSheet } from '@/features/activity-player/ask-sheet'
import {
  fallbackReviewBlocks,
  generateAskPage,
  generateReviewBlocks,
  writeActivityDoc,
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
  const [libraryItem] = useState(() => {
    const item = activity ? getLibraryItem(activity.libraryItemId) : undefined
    return item
      ? {
          name: item.name,
          overview: item.overview,
          about: [item.overview, item.whyItHelps, item.activation].filter(Boolean).join('\n\n'),
        }
      : undefined
  })
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
  const reviewRequested = useRef(false)
  const latest = useRef<ActivityDoc | null>(activity?.doc ?? null)
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
  // page 1 renders as soon as it parses). A card Today is already writing joins
  // that write; leaving doesn't cancel it, the document is kept for later.
  useEffect(() => {
    if (!activity || activity.doc) return
    let left = false
    const write = writeActivityDoc(activity, setPartial)
    write.promise.then(
      (written) => {
        // Already stored by the write itself; only later revisions need saving.
        latest.current = written
        if (!left) setDoc(written)
      },
      (e: unknown) => {
        if (!left) setGenError(describeAiError(e))
      },
    )
    return () => {
      left = true
      write.unsubscribe()
    }
  }, [activity, attempt])

  /**
   * Every revision to the document after it was written — G6's review page, an
   * Ask page — goes through here, so it merges into the document as it stands
   * rather than into the snapshot the call started from. A generation that
   * resolves late must never replace the whole document: an Ask page inserted
   * while G6 was in flight would disappear, from the screen and from the row.
   *
   * It merges into a ref rather than into rendered state, and stores what it
   * merged, so a call that lands after the learner closed the activity still
   * reaches the row: the screen is gone, but the generation was paid for and
   * the page they come back to should have it.
   */
  const reviseDoc = useCallback(
    (revise: (prev: ActivityDoc) => ActivityDoc) => {
      const prev = latest.current
      if (!activity || prev === null) return
      const next = revise(prev)
      if (next === prev) return
      latest.current = next
      attachDoc(db, repoContext, activity.id, next)
      setDoc(next)
    },
    [activity],
  )

  const changePage = useCallback(
    (next: number) => {
      setPage(next)
      if (activity) saveProgress(db, repoContext, activity.id, next)
    },
    [activity],
  )

  // G6, once they move past the last page that asked them anything. Derived
  // from where they are rather than fired from the page change, so it reads the
  // document Ask may have just grown.
  useEffect(() => {
    if (!activity || !doc || reviewRequested.current) return
    const review = reviewPageIndex(doc)
    if (review === -1 || doc.pages[review]?.blocks !== null) return
    if (page <= lastInteractivePageIndex(doc)) return
    reviewRequested.current = true
    generateReviewBlocks(activity, doc)
      .then((blocks) => reviseDoc((prev) => fillReviewPage(prev, blocks)))
      .catch(() => reviseDoc((prev) => fillReviewPage(prev, fallbackReviewBlocks(prev))))
  }, [activity, doc, page, reviseDoc])

  // If G6 is slow or failed, the review page becomes a plain recap rather than
  // sitting empty (docs/04 §Failure handling).
  useEffect(() => {
    if (!activity || !doc) return
    const review = reviewPageIndex(doc)
    if (review !== page || doc.pages[review]?.blocks !== null) return
    const timer = setTimeout(() => {
      reviseDoc((prev) => fillReviewPage(prev, fallbackReviewBlocks(prev)))
    }, REVIEW_PATIENCE_MS)
    return () => clearTimeout(timer)
  }, [activity, doc, page, reviseDoc])

  /** G7: the answer streams into a page inserted after the current one. */
  const ask = useCallback(
    (question: string) => {
      if (!activity || !doc) return
      setAskState('pending')
      questionsAsked.current += 1
      track('question_asked', { tier: activity.tier })
      // Both settled before the first block lands: deciding them inside the
      // state updater would make it impure, and React may run an updater more
      // than once or later than the line after it.
      const pageId = repoContext.newId()
      const askedFrom = page
      let shown = false
      const applyBlocks = (blocks: Block[]) => {
        if (blocks.length === 0) return
        reviseDoc((prev) =>
          prev.pages.some((p) => p.id === pageId)
            ? { ...prev, pages: prev.pages.map((p) => (p.id === pageId ? { ...p, blocks } : p)) }
            : insertPageAfter(prev, askedFrom, {
                id: pageId,
                kind: 'inserted',
                question,
                blocks,
              }),
        )
        if (shown) return
        shown = true
        setAskOpen(false)
        setAskState('idle')
        changePage(askedFrom + 1)
      }

      generateAskPage(activity, doc, page, question, { onPartial: applyBlocks })
        .then(applyBlocks)
        .catch((e: unknown) => {
          setAskState('error')
          setAskError(describeAiError(e))
        })
    },
    [activity, changePage, doc, page, reviseDoc],
  )

  const onShare = useCallback(
    (comment: string) => {
      if (!activity || !doc) return
      setShareState('pending')
      // Nothing the learner wrote travels with a report — not their answers,
      // not the questions they asked — only the note they typed here (docs/08
      // §Activity quality review).
      const report: ActivityReport = {
        title: activity.title,
        libraryItemId: activity.libraryItemId,
        tier: activity.tier,
        rating,
        comment,
        doc: docForReport(doc),
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
        <GenerationError
          message={genError}
          onRetry={() => {
            setGenError(null)
            setPartial(null)
            setAttempt((n) => n + 1)
          }}
        />
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
      libraryItem={libraryItem}
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
        router.back()
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
