import { beforeEach, describe, expect, it } from 'vitest'
import {
  completeActivity,
  getActivity,
  createActivity,
  createGoal,
  createInterest,
  listCompletedBetween,
  listHistoryPage,
  softDeleteGoal,
  startActivity,
} from '../src'
import type { Database } from '../src/database'
import { openTestDb, testContext } from './helpers'

/** What History and the Me calendar read: completed activities with their goal's title. */

let db: Database
let ctx: ReturnType<typeof testContext>

beforeEach(() => {
  ;({ db } = openTestDb())
  ctx = testContext()
})

function interest(name: string) {
  return createInterest(db, ctx, {
    name,
    wantToLearn: `Learn ${name}`,
    whyChoice: 'fun',
    experienceChoice: 'explored',
    frequency: 'daily',
    sessionMinutes: 10,
    status: 'exploring',
    sortOrder: 1,
  })
}

function completed(
  interestId: string,
  opts: { goalId?: string | null; topic?: string | null; at: number },
) {
  const activity = createActivity(db, ctx, {
    interestId,
    goalId: opts.goalId ?? null,
    topic: opts.topic ?? null,
    section: 'next',
    tier: 'introduce',
    libraryItemId: 'worked-example',
    title: 'Tokens, not words',
    estMinutes: 10,
    plannedFor: '2026-09-15',
  })
  const at = ctx.now()
  ctx.advance(opts.at - at)
  completeActivity(db, ctx, activity.id)
  return activity
}

describe('listHistoryPage', () => {
  it('pages newest-first across the selected interests only', () => {
    const german = interest('German')
    const chess = interest('Chess')
    const goal = createGoal(db, ctx, {
      interestId: german.id,
      title: 'Order a coffee',
      description: 'Café basics.',
      concepts: [],
      sortOrder: 1,
      source: 'intake',
    })
    const first = completed(german.id, { goalId: goal.id, at: 1_000 })
    const second = completed(german.id, { goalId: goal.id, at: 2_000 })
    const other = completed(chess.id, { at: 3_000, topic: 'Openings' })

    const page = listHistoryPage(db, { interestIds: [german.id], limit: 10 })
    expect(page.map((r) => r.id)).toEqual([second.id, first.id])
    expect(page[0]!.goalTitle).toBe('Order a coffee')

    const next = listHistoryPage(db, {
      interestIds: [german.id],
      beforeCompletedAt: page[0]!.completedAt,
      limit: 10,
    })
    expect(next.map((r) => r.id)).toEqual([first.id])

    const everything = listHistoryPage(db, { limit: 10 })
    expect(everything.map((r) => r.id)).toEqual([other.id, second.id, first.id])
    expect(everything[0]!.topic).toBe('Openings')
  })

  it('keeps the row when its goal has been deleted', () => {
    const german = interest('German')
    const goal = createGoal(db, ctx, {
      interestId: german.id,
      title: 'Order a coffee',
      description: 'Café basics.',
      concepts: [],
      sortOrder: 1,
      source: 'intake',
    })
    completed(german.id, { goalId: goal.id, at: 1_000 })
    softDeleteGoal(db, ctx, goal.id)

    const page = listHistoryPage(db, { interestIds: [german.id], limit: 10 })
    expect(page).toHaveLength(1)
    expect(page[0]!.goalTitle).toBe('Order a coffee')
  })
})

describe('listCompletedBetween', () => {
  it('returns only the rows inside the range, inclusive', () => {
    const german = interest('German')
    completed(german.id, { at: 1_000, topic: 'a' })
    const inside = completed(german.id, { at: 2_000, topic: 'b' })
    completed(german.id, { at: 4_000, topic: 'c' })

    const found = listCompletedBetween(db, { fromMs: 2_000, toMs: 3_000 })
    expect(found.map((r) => r.id)).toEqual([inside.id])
  })
})

describe('reopening from History', () => {
  it('leaves a completed activity completed', () => {
    const german = interest('German')
    const activity = completed(german.id, { at: 1_000, topic: 'Greetings' })
    startActivity(db, ctx, activity.id)
    expect(getActivity(db, activity.id)?.status).toBe('completed')
    expect(listHistoryPage(db, { interestIds: [german.id], limit: 10 })).toHaveLength(1)
  })
})
