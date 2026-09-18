import {
  describeResponse,
  extractPartialBlocks,
  extractPartialActivityDoc,
  fillReviewPage,
  getLibraryItem,
  groundBlocks,
  groundPages,
  interactiveBlocksBeforeReview,
  pageToPlainText,
  parseResponsePayload,
  pickResource,
  type ActivityDoc,
  type ActivityGenerateParams,
  type ActivityQuestionParams,
  type ActivityReviewParams,
  type Block,
  type PartialActivityDoc,
  type QuestionOutput,
  type ReviewOutput,
} from '@thinkering/core'
import {
  attachDoc,
  getGoal,
  getInterest,
  listResources,
  listResponses,
  type Activity,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { interestContext } from '@/ai/context'
import { db, repoContext } from '@/db'

/**
 * The three generation calls an activity makes (docs/04): G5b writes the
 * document (streamed, page by page), G6 fills the reserved review page from
 * the learner's answers, and G7 answers an Ask. Each persists what it gets —
 * an Ask page survives leaving and coming back.
 */

/** G5b. Streams; `onPartial` fires as each page closes so page 1 renders early. */
export async function generateActivityDoc(
  activity: Activity,
  opts: { signal?: AbortSignal; onPartial?: (partial: PartialActivityDoc) => void } = {},
): Promise<ActivityDoc> {
  const interest = getInterest(db, activity.interestId)
  if (!interest) throw new Error('interest is gone')
  const goal = activity.goalId ? getGoal(db, activity.goalId) : undefined
  const saved = listResources(db, activity.interestId)
  const resource = pickResource(getLibraryItem(activity.libraryItemId), activity.goalId, saved)

  const params: ActivityGenerateParams = {
    context: interestContext(interest),
    goal: goal
      ? {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          concepts: goal.concepts,
        }
      : // The prerequisite-fallback card has no goal yet — the topic stands in for one.
        {
          id: 'prerequisite',
          title: activity.topic ?? 'Foundations',
          description: 'A prerequisite for the goals ahead — not itself a goal on their path.',
          status: 'not_started',
          concepts: [],
        },
    tier: activity.tier,
    libraryItemId: activity.libraryItemId,
    title: activity.title,
    estMinutes: activity.estMinutes,
    ...(resource
      ? {
          resource: {
            id: resource.id,
            url: resource.url,
            title: resource.title,
            summary: resource.summary,
            howToUse: resource.howToUse,
          },
        }
      : {}),
  }

  const { output } = await callAi<ActivityDoc>('activity.generate', params, {
    interestId: activity.interestId,
    activityId: activity.id,
    signal: opts.signal,
    onText: opts.onPartial
      ? (text) => {
          const partial = extractPartialActivityDoc(text)
          opts.onPartial!({ ...partial, pages: groundPages(partial.pages, saved) })
        }
      : undefined,
  })
  // Embeds only play what the learner has saved (docs/05).
  const doc = { ...output, pages: groundPages(output.pages, saved) }
  attachDoc(db, repoContext, activity.id, doc)
  return doc
}

/**
 * G6. Fires when the learner finishes the last interactive page before the
 * review slot, so it lands while they read that page (docs/05).
 */
export async function generateReviewPage(
  activity: Activity,
  doc: ActivityDoc,
  opts: { signal?: AbortSignal } = {},
): Promise<ActivityDoc> {
  const interest = getInterest(db, activity.interestId)
  if (!interest) throw new Error('interest is gone')
  const goal = activity.goalId ? getGoal(db, activity.goalId) : undefined

  const answers = new Map(
    listResponses(db, activity.id).map((row) => [row.blockId, parseResponsePayload(row.payload)]),
  )
  const asked = interactiveBlocksBeforeReview(doc)
  const responses = asked.flatMap(({ block }) => {
    const payload = 'id' in block ? answers.get(block.id) : undefined
    const line = payload ? describeResponse(block, payload) : undefined
    return line ? [line] : []
  })

  const params: ActivityReviewParams = {
    context: interestContext(interest),
    activityTitle: activity.title,
    tier: activity.tier,
    goal: {
      title: goal?.title ?? activity.topic ?? activity.title,
      description: goal?.description ?? '',
    },
    conceptLabels: doc.concepts.map((c) => c.label),
    responses,
    // Sparse answers get the fallback the prompt describes instead of a
    // review of nothing.
    ...(responses.length * 2 < asked.length && doc.concepts[0]
      ? { trickiestConcept: doc.concepts[0].label }
      : {}),
  }

  const { output } = await callAi<ReviewOutput>('activity.review', params, {
    interestId: activity.interestId,
    activityId: activity.id,
    signal: opts.signal,
  })
  return persist(activity, fillReviewPage(doc, output.blocks))
}

/**
 * The review page when G6 couldn't deliver (docs/04): a plain recap rather than
 * a page that sits empty. Never pretends to have read their answers.
 */
export function fallbackReviewPage(activity: Activity, doc: ActivityDoc): ActivityDoc {
  const labels = doc.concepts.map((c) => c.label)
  const blocks: Block[] = [
    {
      kind: 'paragraph',
      md:
        labels.length > 0
          ? `Worth holding on to from this one: ${labels.join(', ')}.`
          : 'Worth holding on to: the idea this activity was built around.',
    },
  ]
  return persist(activity, fillReviewPage(doc, blocks))
}

/** G7 (Ask). Streams the answer into a page inserted after the current one. */
export async function generateAskPage(
  activity: Activity,
  doc: ActivityDoc,
  pageIndex: number,
  question: string,
  opts: { signal?: AbortSignal; onPartial?: (blocks: Block[]) => void } = {},
): Promise<Block[]> {
  const interest = getInterest(db, activity.interestId)
  if (!interest) throw new Error('interest is gone')
  const goal = activity.goalId ? getGoal(db, activity.goalId) : undefined
  const page = doc.pages[pageIndex]
  const saved = listResources(db, activity.interestId)

  const params: ActivityQuestionParams = {
    context: interestContext(interest),
    activityTitle: activity.title,
    goal: {
      title: goal?.title ?? activity.topic ?? activity.title,
      description: goal?.description ?? '',
    },
    currentPageText: page ? pageToPlainText(page) : '',
    question,
  }

  const { output } = await callAi<QuestionOutput>('activity.question', params, {
    interestId: activity.interestId,
    activityId: activity.id,
    signal: opts.signal,
    onText: opts.onPartial
      ? (text) => opts.onPartial!(groundBlocks(extractPartialBlocks(text), saved))
      : undefined,
  })
  return groundBlocks(output.blocks, saved)
}

function persist(activity: Activity, doc: ActivityDoc): ActivityDoc {
  attachDoc(db, repoContext, activity.id, doc)
  return doc
}

/**
 * The Next card's document is written ahead of the tap (docs/04 §Prefetch):
 * it's the card most likely to be used, and the only one worth spending on
 * before the user asks. Failures are silent — tapping generates it for real.
 */
export function prefetchNextActivity(activities: readonly Activity[], signal?: AbortSignal): void {
  const card = activities.find(
    (a) => a.section === 'next' && a.doc === null && a.status === 'planned',
  )
  if (!card) return
  generateActivityDoc(card, { signal }).catch(() => {})
}
