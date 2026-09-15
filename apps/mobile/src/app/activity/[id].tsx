import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  describeResponse,
  parseResponsePayload,
  type ActivityDoc,
  type Rating,
  type ResponsePayload,
} from '@thinkering/core'
import {
  completeActivity,
  getActivity,
  listResponses,
  rateActivity,
  saveProgress,
  saveResponse,
  startActivity,
} from '@thinkering/db'

import { Button } from '@/components/button'
import { db, repoContext } from '@/db'
import { ActivityPlayer } from '@/features/activity-player/player'
import type { ResponseSink } from '@/features/activity-player/responses'
import { postFeedback, type ActivityReport } from '@/feedback/client'

/**
 * Playing one activity (docs/05). The route owns persistence — responses, the
 * resume point, the rating, completion — and the player owns the rendering.
 */
export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activity] = useState(() => (id ? getActivity(db, id) : undefined))
  const [rating, setRating] = useState<Rating | null>(activity?.rating ?? null)
  const [ratingText, setRatingText] = useState(activity?.ratingText ?? '')
  const [shareState, setShareState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  // The live answer map is the sink's own: sharing reads the latest answers
  // without the player re-rendering every time one is recorded.
  const { sink, answers } = useMemo(() => {
    const answers: Record<string, ResponsePayload> = {}
    if (!activity) return { sink: { initial: answers, save: () => {} } as ResponseSink, answers }
    for (const row of listResponses(db, activity.id)) {
      const payload = parseResponsePayload(row.payload)
      if (payload) answers[row.blockId] = payload
    }
    const sink: ResponseSink = {
      initial: { ...answers },
      save: (pageId, blockId, payload) => {
        answers[blockId] = payload
        saveResponse(db, repoContext, { activityId: activity.id, pageId, blockId, payload })
      },
    }
    return { sink, answers }
  }, [activity])

  const onShare = useCallback(
    (includeResponses: boolean) => {
      if (!activity?.doc) return
      setShareState('pending')
      const report: ActivityReport = {
        title: activity.title,
        libraryItemId: activity.libraryItemId,
        tier: activity.tier,
        rating,
        comment: ratingText,
        doc: activity.doc,
        ...(includeResponses ? { responses: describeAnswers(activity.doc, answers) } : {}),
      }
      postFeedback({
        message: `Shared activity: ${activity.title}`,
        screen: 'activity',
        activityReport: report,
      })
        .then(() => setShareState('done'))
        .catch(() => setShareState('error'))
    },
    [activity, answers, rating, ratingText],
  )

  if (!activity) return <Missing message="This activity is no longer here." />
  if (!activity.doc) return <Missing message="This activity hasn't been written yet." />

  startActivity(db, repoContext, activity.id)

  return (
    <ActivityPlayer
      doc={activity.doc}
      sink={sink}
      startPage={activity.currentPage}
      rating={rating}
      ratingText={ratingText}
      onPageChange={(index) => saveProgress(db, repoContext, activity.id, index)}
      onRate={(next, text) => {
        setRating(next)
        setRatingText(text)
        rateActivity(db, repoContext, activity.id, next, text)
      }}
      onDone={() => {
        completeActivity(db, repoContext, activity.id)
        router.back()
      }}
      onClose={() => router.back()}
      onShare={onShare}
      shareState={shareState}
    />
  )
}

/** The user's answers as plain question/answer lines — only ever sent when they ask (D18). */
function describeAnswers(doc: ActivityDoc, answers: Record<string, ResponsePayload>) {
  const lines: { prompt: string; answer: string }[] = []
  for (const page of doc.pages) {
    for (const block of page.blocks ?? []) {
      const id = 'id' in block ? block.id : undefined
      const payload = id ? answers[id] : undefined
      const described = payload ? describeResponse(block, payload) : undefined
      if (described) lines.push({ prompt: page.id, answer: described })
    }
  }
  return lines
}

function Missing({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center font-sans text-body text-ink-soft">{message}</Text>
        <Button label="Back" variant="quiet" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  )
}
