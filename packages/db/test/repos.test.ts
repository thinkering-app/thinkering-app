import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  abandonActivity,
  completeActivity,
  createActivity,
  createGoal,
  createInterest,
  getActivity,
  getGoal,
  listGoals,
  listHistory,
  listInterests,
  listResponses,
  rateActivity,
  saveProgress,
  saveResponse,
  softDeleteGoal,
  softDeleteInterest,
  updateGoal,
  updateInterest,
} from '../src'
import type { Database } from '../src/database'
import * as schema from '../src/schema'
import { openTestDb, testContext } from './helpers'

let db: Database
let ctx: ReturnType<typeof testContext>

beforeEach(() => {
  ;({ db } = openTestDb())
  ctx = testContext()
})

function makeInterest() {
  return createInterest(db, ctx, {
    name: 'Understanding LLMs',
    wantToLearn: 'Understand LLMs and AI',
    whyChoice: 'career',
    experienceChoice: 'explored',
    frequency: 'daily',
    sessionMinutes: 10,
    status: 'focus',
    sortOrder: 1,
  })
}

function makeGoal(interestId: string, sortOrder = 1) {
  return createGoal(db, ctx, {
    interestId,
    title: 'Explain what a token is',
    description: 'Tokens and why they matter.',
    concepts: [{ id: 'c-tokens', label: 'Tokenization', kind: 'concept' }],
    sortOrder,
    source: 'intake',
  })
}

function makeActivity(
  interestId: string,
  goalId: string,
  tier: 'introduce' | 'strengthen' | 'apply' = 'introduce',
) {
  return createActivity(db, ctx, {
    interestId,
    goalId,
    section: tier === 'introduce' ? 'next' : tier === 'strengthen' ? 'strengthen' : 'go_further',
    tier,
    libraryItemId: 'plain-explainer',
    title: 'Tokens, not words',
    estMinutes: 5,
    plannedFor: '2026-09-15',
  })
}

describe('soft delete', () => {
  it('soft-deleted rows never come back from queries, and children cascade', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const activity = makeActivity(interest.id, goal.id)
    saveResponse(db, ctx, {
      activityId: activity.id,
      pageId: 'p1',
      blockId: 'q1',
      payload: { kind: 'mcq', selectedId: 'b', correct: true },
    })

    softDeleteInterest(db, ctx, interest.id)

    expect(listInterests(db)).toEqual([])
    expect(listGoals(db, interest.id)).toEqual([])
    expect(getActivity(db, activity.id)).toBeUndefined()
    expect(listResponses(db, activity.id)).toEqual([])

    // Tombstoned, not hard-deleted (synced rows are never removed).
    const raw = db.select().from(schema.interests).where(eq(schema.interests.id, interest.id)).get()
    expect(raw?.deletedAt).toBe(ctx.now())
    const rawResponse = db.select().from(schema.responses).all()
    expect(rawResponse).toHaveLength(1)
    expect(rawResponse[0]?.deletedAt).toBe(ctx.now())
  })

  it('soft-deleting a goal removes it from the path but keeps the row', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    softDeleteGoal(db, ctx, goal.id)
    expect(listGoals(db, interest.id)).toEqual([])
    expect(db.select().from(schema.goals).all()).toHaveLength(1)
  })
})

describe('updated_at discipline', () => {
  it('every write bumps updated_at to the injected clock', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)

    ctx.advance(5_000)
    updateInterest(db, ctx, interest.id, { name: 'LLMs in practice' })
    updateGoal(db, ctx, goal.id, { title: 'Tokens, precisely' })

    expect(listInterests(db)[0]?.updatedAt).toBe(ctx.now())
    expect(getGoal(db, goal.id)?.updatedAt).toBe(ctx.now())
    expect(getGoal(db, goal.id)?.createdAt).toBeLessThan(ctx.now())
  })
})

describe('activity lifecycle and goal transitions', () => {
  it('completing an introduce activity advances the goal and stamps introduced_at', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const activity = makeActivity(interest.id, goal.id)

    ctx.advance(1_000)
    completeActivity(db, ctx, activity.id)

    const done = getActivity(db, activity.id)
    expect(done?.status).toBe('completed')
    expect(done?.completedAt).toBe(ctx.now())

    const g = getGoal(db, goal.id)
    expect(g?.status).toBe('introduced')
    expect(g?.introducedAt).toBe(ctx.now())
  })

  it('goal status is monotonic: strengthen on an applied goal re-stamps strengthened_at but not status', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    completeActivity(db, ctx, makeActivity(interest.id, goal.id, 'introduce').id)
    completeActivity(db, ctx, makeActivity(interest.id, goal.id, 'strengthen').id)
    const firstStrengthenedAt = getGoal(db, goal.id)?.strengthenedAt
    completeActivity(db, ctx, makeActivity(interest.id, goal.id, 'apply').id)
    expect(getGoal(db, goal.id)?.status).toBe('applied')

    ctx.advance(60_000)
    completeActivity(db, ctx, makeActivity(interest.id, goal.id, 'strengthen').id)
    const g = getGoal(db, goal.id)
    expect(g?.status).toBe('applied') // no regression
    expect(g?.strengthenedAt).toBe(ctx.now()) // spaced review orders by the latest strengthen
    expect(g?.strengthenedAt).not.toBe(firstStrengthenedAt)
  })

  it('completing twice does not double-apply, and abandon does not touch the goal', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const a1 = makeActivity(interest.id, goal.id)
    completeActivity(db, ctx, a1.id)
    const introducedAt = getGoal(db, goal.id)?.introducedAt
    ctx.advance(1_000)
    completeActivity(db, ctx, a1.id)
    expect(getGoal(db, goal.id)?.introducedAt).toBe(introducedAt)

    const a2 = makeActivity(interest.id, goal.id, 'strengthen')
    abandonActivity(db, ctx, a2.id)
    expect(getGoal(db, goal.id)?.status).toBe('introduced')
  })

  it('history lists completed activities newest-first with keyset pagination', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const a = makeActivity(interest.id, goal.id)
      ctx.advance(1_000)
      completeActivity(db, ctx, a.id)
      ids.push(a.id)
    }
    const all = listHistory(db, { interestId: interest.id })
    expect(all.map((a) => a.id)).toEqual([...ids].reverse())

    const page2 = listHistory(db, {
      interestId: interest.id,
      beforeCompletedAt: all[0]!.completedAt!,
    })
    expect(page2.map((a) => a.id)).toEqual([ids[1], ids[0]])
  })

  it('saveProgress and rating persist', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const a = makeActivity(interest.id, goal.id)
    saveProgress(db, ctx, a.id, 3)
    rateActivity(db, ctx, a.id, 'up', 'clear and quick')
    const row = getActivity(db, a.id)
    expect(row?.currentPage).toBe(3)
    expect(row?.rating).toBe('up')
    expect(row?.ratingText).toBe('clear and quick')
  })
})

describe('responses', () => {
  it('re-answering the same block updates the existing row', () => {
    const interest = makeInterest()
    const goal = makeGoal(interest.id)
    const a = makeActivity(interest.id, goal.id)

    saveResponse(db, ctx, {
      activityId: a.id,
      pageId: 'p1',
      blockId: 'q1',
      payload: { kind: 'mcq', selectedId: 'a', correct: false },
    })
    ctx.advance(2_000)
    saveResponse(db, ctx, {
      activityId: a.id,
      pageId: 'p1',
      blockId: 'q1',
      payload: { kind: 'mcq', selectedId: 'b', correct: true },
    })

    const rows = listResponses(db, a.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.payload).toEqual({ kind: 'mcq', selectedId: 'b', correct: true })
    expect(rows[0]?.updatedAt).toBe(ctx.now())
  })
})
