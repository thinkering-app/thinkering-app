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
  getActivity,
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

/**
 * G5b. Streams; `onPartial` fires first when the model starts writing and then
 * as each page closes, so page 1 renders early.
 *
 * One generation per activity at a time: a caller that arrives while one is
 * running — the tap on a Next card whose prefetch hasn't finished — joins it
 * and is caught up with the pages so far instead of starting over. The
 * generation stops only when every caller holding it has let go; a caller
 * without a signal (the prefetch) holds it to the end.
 */
export function generateActivityDoc(
  activity: Activity,
  opts: { signal?: AbortSignal; onPartial?: (partial: PartialActivityDoc) => void } = {},
): Promise<ActivityDoc> {
  const running = inFlight.get(activity.id)
  // One everyone has let go of is on its way out, not something to join.
  const run = running && !running.controller.signal.aborted ? running : startGeneration(activity)
  const { signal, onPartial } = opts
  if (onPartial) {
    run.listeners.add(onPartial)
    if (run.latest) onPartial(run.latest)
  }
  run.holders += 1

  return new Promise((resolve, reject) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      signal?.removeEventListener('abort', onAbort)
      if (onPartial) run.listeners.delete(onPartial)
      run.holders -= 1
    }
    const onAbort = () => {
      release()
      if (run.holders === 0) run.controller.abort()
      reject(new DOMException('aborted', 'AbortError'))
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort)
    run.promise.then(
      (doc) => {
        release()
        resolve(doc)
      },
      (e: unknown) => {
        release()
        reject(e)
      },
    )
  })
}

interface Generation {
  promise: Promise<ActivityDoc>
  controller: AbortController
  latest: PartialActivityDoc | null
  listeners: Set<(partial: PartialActivityDoc) => void>
  holders: number
}

const inFlight = new Map<string, Generation>()

function startGeneration(activity: Activity): Generation {
  const controller = new AbortController()
  const publish = (partial: PartialActivityDoc) => {
    run.latest = partial
    for (const listener of run.listeners) listener(partial)
  }
  const run: Generation = {
    promise: writeActivityDoc(activity, controller.signal, publish).finally(() => {
      if (inFlight.get(activity.id) === run) inFlight.delete(activity.id)
    }),
    controller,
    latest: null,
    listeners: new Set(),
    holders: 0,
  }
  inFlight.set(activity.id, run)
  return run
}

async function writeActivityDoc(
  activity: Activity,
  signal: AbortSignal,
  onPartial: (partial: PartialActivityDoc) => void,
): Promise<ActivityDoc> {
  // The caller's row may predate a generation that has since finished.
  const written = getActivity(db, activity.id)?.doc
  if (written) return written

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
    signal,
    onText: onNewPartial(
      (text) => {
        const partial = extractPartialActivityDoc(text)
        return { ...partial, pages: groundPages(partial.pages, saved) }
      },
      onPartial,
      docShape,
    ),
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
      ? onNewPartial(
          (text) => groundBlocks(extractPartialBlocks(text), saved),
          opts.onPartial,
          (blocks) => `${blocks.length}`,
        )
      : undefined,
  })
  return groundBlocks(output.blocks, saved)
}

/**
 * A stream's text grows by a token at a time, but what it renders changes only
 * as a page or block closes. Passes a partial on only when its shape moves, so
 * the screen re-renders per page rather than per token.
 */
function onNewPartial<T>(
  extract: (text: string) => T,
  emit: (partial: T) => void,
  shape: (partial: T) => string,
) {
  let last: string | undefined
  return (text: string) => {
    const partial = extract(text)
    const next = shape(partial)
    if (next === last) return
    last = next
    emit(partial)
  }
}

function docShape(partial: PartialActivityDoc): string {
  return `${partial.pages.length}|${partial.title ?? ''}|${partial.estMinutes ?? ''}`
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
export function prefetchNextActivity(activities: readonly Activity[]): void {
  const card = activities.find(
    (a) => a.section === 'next' && a.doc === null && a.status === 'planned',
  )
  if (!card) return
  generateActivityDoc(card).catch(() => {})
}
