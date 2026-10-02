import { useSyncExternalStore } from 'react'
import {
  describeResponse,
  extractPartialBlocks,
  extractPartialActivityDoc,
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
 * the learner's answers, and G7 answers an Ask. G5b owns its document and
 * stores it; G6 and G7 return blocks for the route to merge into the document
 * as it stands and persist from there — a call that started before an Ask must
 * not overwrite the page the Ask inserted.
 */

/**
 * G5b. Streams; `onPartial` fires first when the model starts writing and then
 * as each page closes, so page 1 renders early.
 * Callers go through `writeActivityDoc`, so one card never streams twice.
 */
async function generateActivityDoc(
  activity: Activity,
  opts: { onPartial?: (partial: PartialActivityDoc) => void } = {},
): Promise<ActivityDoc> {
  // The caller's row may predate a write that has since finished.
  const written = getActivity(db, activity.id)?.doc
  if (written) return written

  const interest = getInterest(db, activity.interestId)
  if (!interest) throw new Error('interest is gone')
  const goal = activity.goalId ? getGoal(db, activity.goalId) : undefined
  const saved = listResources(db, activity.interestId)
  const resource = pickResource(
    getLibraryItem(activity.libraryItemId),
    activity.goalId,
    saved,
    activity.resourceId,
  )

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
      : activity.focus
        ? // A request with no goal: what they asked about stands in for one.
          {
            id: 'request',
            title: activity.topic ?? activity.title,
            description:
              'Something the learner asked to work on — not itself a goal on their path.',
            status: 'not_started',
            concepts: [],
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
    ...(activity.focus ? { focus: activity.focus } : {}),
    reading: interest.readingAmount,
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
    onText: opts.onPartial
      ? onNewPartial(
          (text) => {
            const partial = extractPartialActivityDoc(text)
            return { ...partial, pages: groundPages(partial.pages, saved) }
          },
          opts.onPartial,
          docShape,
        )
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
 *
 * Returns the blocks, not a document: `doc` is the snapshot the call was made
 * from, and by the time it resolves an Ask may have inserted a page into the
 * real one. The caller merges into current state (docs/05 §Ask).
 */
export async function generateReviewBlocks(
  activity: Activity,
  doc: ActivityDoc,
  opts: { signal?: AbortSignal } = {},
): Promise<Block[]> {
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
  return output.blocks
}

/**
 * The review page's blocks when G6 couldn't deliver (docs/04): a plain recap
 * rather than a page that sits empty. Never pretends to have read their answers.
 */
export function fallbackReviewBlocks(doc: ActivityDoc): Block[] {
  const labels = doc.concepts.map((c) => c.label)
  return [
    {
      kind: 'paragraph',
      md:
        labels.length > 0
          ? `Worth holding on to from this one: ${labels.join(', ')}.`
          : 'Worth holding on to: the idea this activity was built around.',
    },
  ]
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

// ── Writing ahead (docs/04 §Latency & cost) ──────────────────────────────────

/**
 * Next's card has its document written before the tap; Strengthen and Go
 * further offer Write and are written when asked for (docs/04 §Latency &
 * cost). Writing all three ahead spent three documents on a day most people
 * take one card from, and an activity document is the most expensive call the
 * app makes. Each write is shared: opening a card whose document is already
 * being written joins that stream instead of starting a second one, and
 * leaving the screen doesn't cancel it — the document is kept for when they
 * come back.
 */

const SECTION_ORDER: Record<Activity['section'], number> = { next: 0, strengthen: 1, go_further: 2 }

interface Write {
  promise: Promise<ActivityDoc>
  latest: PartialActivityDoc | null
  listeners: Set<(partial: PartialActivityDoc) => void>
}

const inFlight = new Map<string, Write>()
/**
 * Written ahead and failed this session — left for the learner to retry with
 * Write. A write the app was backgrounded during lands here too: the stream
 * died with the suspended app, and the model had already produced most of a
 * document by then, so starting a second one spends that again on a card
 * nobody has asked for.
 */
const failed = new Set<string>()
let queue: Activity[] = []
/** Streams written ahead at once: enough for a couple of interests in view, without flooding the meter. */
const WRITERS = 2
let writers = 0
/** The writes under way, as Today reads them (`useWritingDocs`). */
export interface WritingDocs {
  /** Queued or streaming: a document is on its way, so the card must not offer Write. */
  ids: ReadonlySet<string>
  /** Streaming with page 1 in hand: openable now, so the card shows its time, not Writing. */
  ready: ReadonlySet<string>
}

let writingDocs: WritingDocs = { ids: new Set(), ready: new Set() }
const watchers = new Set<() => void>()

function publish() {
  writingDocs = {
    ids: new Set([...inFlight.keys(), ...queue.map((a) => a.id)]),
    ready: new Set([...inFlight].filter(([, write]) => hasFirstPage(write)).map(([id]) => id)),
  }
  for (const watcher of watchers) watcher()
}

function hasFirstPage(write: Write): boolean {
  return (write.latest?.pages.length ?? 0) > 0
}

/**
 * Writes an activity's document, or joins the write already under way. The
 * partials seen so far are replayed to a late joiner, so page 1 shows at once.
 */
export function writeActivityDoc(
  activity: Activity,
  onPartial?: (partial: PartialActivityDoc) => void,
): { promise: Promise<ActivityDoc>; unsubscribe: () => void } {
  let write = inFlight.get(activity.id)
  if (!write) {
    const created: Write = { promise: undefined as never, latest: null, listeners: new Set() }
    failed.delete(activity.id)
    created.promise = generateActivityDoc(activity, {
      onPartial: (partial) => {
        const wasWaiting = !hasFirstPage(created)
        created.latest = partial
        // Page 1 landing changes what the card on Today offers.
        if (wasWaiting && hasFirstPage(created)) publish()
        for (const listener of created.listeners) listener(partial)
      },
    })
      .catch((error: unknown) => {
        failed.add(activity.id)
        throw error
      })
      .finally(() => {
        inFlight.delete(activity.id)
        publish()
      })
    write = created
    inFlight.set(activity.id, write)
    queue = queue.filter((a) => a.id !== activity.id)
    publish()
  }
  const current = write
  if (onPartial) {
    current.listeners.add(onPartial)
    if (current.latest) onPartial(current.latest)
  }
  return {
    promise: current.promise,
    unsubscribe: () => onPartial && current.listeners.delete(onPartial),
  }
}

/**
 * Queues documents for cards that don't have one yet. Failures are silent and
 * not retried here — the card offers Write instead.
 */
export function writeAhead(activities: readonly Activity[]): void {
  const waiting = new Set([...inFlight.keys(), ...queue.map((a) => a.id)])
  const added = activities.filter(
    (a) => a.doc === null && a.status === 'planned' && !waiting.has(a.id) && !failed.has(a.id),
  )
  if (added.length === 0) return
  queue = [...queue, ...added].sort((a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section])
  publish()
  while (writers < WRITERS && queue.length > 0) void drain()
}

async function drain() {
  writers += 1
  try {
    for (let next = queue.shift(); next; next = queue.shift()) {
      // It may have been written, opened or dropped since it was queued.
      const fresh = getActivity(db, next.id)
      if (!fresh || fresh.doc !== null) {
        publish()
        continue
      }
      await writeActivityDoc(fresh).promise.catch(() => {})
    }
  } finally {
    writers -= 1
  }
}

/** The cards whose documents are queued or being written — "Writing" on Today. */
export function useWritingDocs(): WritingDocs {
  return useSyncExternalStore(subscribeWriting, () => writingDocs)
}

function subscribeWriting(watcher: () => void) {
  watchers.add(watcher)
  return () => {
    watchers.delete(watcher)
  }
}
