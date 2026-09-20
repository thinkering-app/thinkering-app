import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { FIXTURE_DOC_INTRODUCE, type ActivityDoc, type Block } from '@thinkering/core'

// `jest.mock` is hoisted above these imports, so the route gets the doubles below.
import ActivityScreen from '@/app/activity/[id]'

/**
 * Ask (docs/05 §Ask) end to end through the route, because the bug worth
 * guarding is in how the route merges two generations: G6 starts from the
 * document as it was when the learner left the last interactive page, and an
 * Ask page inserted while it is in flight must survive it landing.
 */

const mockGenerate = {
  ask: jest.fn(),
  review: jest.fn(),
}
const mockDb = {
  activity: undefined as never,
  attachDoc: jest.fn(),
  saveProgress: jest.fn(),
}

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'activity-1' }),
}))
jest.mock('@/db', () => ({
  db: {},
  repoContext: { now: () => 1_700_000_000_000, newId: () => 'ask-page-1' },
}))
jest.mock('@thinkering/db', () => ({
  getActivity: () => mockDb.activity,
  getGoal: () => ({ title: 'Write prompts that work' }),
  listResponses: () => [],
  startActivity: () => {},
  completeActivity: () => {},
  rateActivity: () => {},
  saveResponse: () => {},
  saveProgress: (...args: unknown[]) => mockDb.saveProgress(...args),
  attachDoc: (...args: unknown[]) => mockDb.attachDoc(...args),
}))
jest.mock('@/analytics', () => ({ track: () => {} }))
jest.mock('@/feedback/client', () => ({ postActivityReport: () => Promise.resolve() }))
jest.mock('@/feedback/context', () => ({ useFeedbackContext: () => ({}) }))
jest.mock('@/features/activity-player/generate', () => ({
  writeActivityDoc: () => ({ promise: new Promise(() => {}), unsubscribe: () => {} }),
  generateAskPage: (...args: unknown[]) => mockGenerate.ask(...args),
  generateReviewBlocks: (...args: unknown[]) => mockGenerate.review(...args),
  fallbackReviewBlocks: () => [{ kind: 'paragraph', md: 'Worth holding on to.' }],
}))

const QUESTION = 'Why does one example beat ten?'
const ANSWER = 'Because the first one pins the format; the rest only pay for it.'

/** Resumed on the last page that asks them something — where Ask races G6. */
function makeActivity(doc: ActivityDoc) {
  return {
    id: 'activity-1',
    interestId: 'interest-1',
    goalId: 'goal-1',
    topic: null,
    focus: null,
    section: 'next',
    tier: 'introduce',
    libraryItemId: doc.libraryItemId,
    title: doc.title,
    estMinutes: doc.estMinutes,
    doc,
    status: 'in_progress',
    currentPage: 2,
    plannedFor: '2026-09-20',
    startedAt: 1_700_000_000_000,
    completedAt: null,
    rating: null,
    ratingText: null,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    deletedAt: null,
  }
}

/** A promise the test resolves, plus the `onPartial` the route handed the call. */
function deferred<T>() {
  let settle: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

describe('ask', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.activity = makeActivity(FIXTURE_DOC_INTRODUCE) as never
  })

  it('keeps the page it inserted when the review generation lands after it', async () => {
    const review = deferred<Block[]>()
    mockGenerate.review.mockReturnValue(review.promise)
    const answer = deferred<Block[]>()
    let onPartial: (blocks: Block[]) => void = () => {}
    mockGenerate.ask.mockImplementation((..._args: unknown[]) => {
      onPartial = (_args[4] as { onPartial: (blocks: Block[]) => void }).onPartial
      return answer.promise
    })

    await render(<ActivityScreen />)

    // Onto the review page: G6 starts here, from a document with no Ask page.
    await fireEvent.press(screen.getByTestId('player-continue'))
    expect(screen.getByLabelText('One more look at your answers')).toBeTruthy()
    expect(mockGenerate.review).toHaveBeenCalledTimes(1)

    await fireEvent.press(screen.getByLabelText('Ask'))
    await fireEvent.changeText(screen.getByLabelText('Your question'), QUESTION)
    await fireEvent.press(screen.getByTestId('ask-submit'))

    const blocks: Block[] = [{ kind: 'paragraph', md: ANSWER }]
    await act(async () => {
      onPartial(blocks)
      answer.settle(blocks)
    })
    expect(screen.getByText(ANSWER)).toBeTruthy()
    expect(screen.getByText(QUESTION)).toBeTruthy()

    await act(async () => {
      review.settle([{ kind: 'paragraph', md: 'You leaned on examples.' }])
    })

    // The page is still there, and the review page behind it got its blocks.
    expect(screen.getByText(ANSWER)).toBeTruthy()
    expect(screen.getByText(QUESTION)).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Back'))
    expect(screen.getByText('You leaned on examples.')).toBeTruthy()

    const stored = mockDb.attachDoc.mock.calls.at(-1)?.[3] as ActivityDoc
    expect(stored.pages.map((p) => p.kind)).toEqual([
      'content',
      'content',
      'content',
      'review',
      'inserted',
      'summary',
    ])
  })
})
