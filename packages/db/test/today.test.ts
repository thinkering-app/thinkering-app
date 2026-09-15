import { beforeEach, describe, expect, it } from 'vitest'
import {
  abandonStalePlans,
  completeActivity,
  createActivity,
  createGoal,
  createInterest,
  createRoutineNote,
  getActivity,
  getCached,
  listLibraryPrefs,
  listPlannedForDate,
  listRoutineNotes,
  putCached,
  setLibraryPref,
  startActivity,
} from '../src'
import type { Database } from '../src/database'
import { openTestDb, testContext } from './helpers'

/** The state Today owns: the day's cards, library activation, routine notes, cached generations. */

let db: Database
let ctx: ReturnType<typeof testContext>

beforeEach(() => {
  ;({ db } = openTestDb())
  ctx = testContext()
})

function interestWithGoal() {
  const interest = createInterest(db, ctx, {
    name: 'Conversational German',
    wantToLearn: 'Get conversational in German',
    whyChoice: 'personal_goal',
    experienceChoice: 'explored',
    frequency: 'daily',
    sessionMinutes: 10,
    status: 'focus',
    sortOrder: 1,
  })
  const goal = createGoal(db, ctx, {
    interestId: interest.id,
    title: 'Order food and drinks',
    description: 'Ordering politely.',
    concepts: [{ id: 'c-order', label: 'Restaurant phrases', kind: 'concept' }],
    sortOrder: 1,
    source: 'intake',
  })
  return { interest, goal }
}

function card(interestId: string, goalId: string, plannedFor: string) {
  return createActivity(db, ctx, {
    interestId,
    goalId,
    section: 'next',
    tier: 'introduce',
    libraryItemId: 'plain-explainer',
    title: 'Hätte gern',
    estMinutes: 10,
    plannedFor,
  })
}

describe('library prefs', () => {
  it('stores one row per item and flips it in place', () => {
    const { interest } = interestWithGoal()
    setLibraryPref(db, ctx, {
      interestId: interest.id,
      section: 'strengthen',
      libraryItemId: 'focused-drill',
      active: false,
    })
    setLibraryPref(db, ctx, {
      interestId: interest.id,
      section: 'strengthen',
      libraryItemId: 'focused-drill',
      active: true,
    })
    expect(listLibraryPrefs(db, interest.id)).toEqual([
      { section: 'strengthen', libraryItemId: 'focused-drill', active: true },
    ])
  })
})

describe('routine notes', () => {
  it('reads an interest with its global notes, oldest first', () => {
    const { interest } = interestWithGoal()
    createRoutineNote(db, ctx, { interestId: null, note: 'Mornings only' })
    ctx.advance(1000)
    createRoutineNote(db, ctx, { interestId: interest.id, note: 'More speaking' })
    const other = createInterest(db, ctx, {
      name: 'Chess',
      wantToLearn: 'Improve my chess',
      whyChoice: 'fun',
      experienceChoice: 'explored',
      frequency: 'when_i_can',
      sessionMinutes: 5,
      status: 'exploring',
      sortOrder: 2,
    })
    createRoutineNote(db, ctx, { interestId: other.id, note: 'Tactics please' })

    expect(listRoutineNotes(db, interest.id).map((n) => n.note)).toEqual(['Mornings only', 'More speaking'])
  })
})

describe('gen cache', () => {
  it('drops an entry once it has expired', () => {
    putCached(db, ctx, { kind: 'goal_suggestions', scopeKey: 'i1', payload: { goals: [] }, expiresAt: 2_000 })
    expect(getCached(db, 'goal_suggestions', 'i1', 1_500)).toEqual({ goals: [] })
    expect(getCached(db, 'goal_suggestions', 'i1', 2_000)).toBeUndefined()
    // Re-putting replaces rather than accumulating.
    putCached(db, ctx, { kind: 'goal_suggestions', scopeKey: 'i1', payload: { goals: ['a'] } })
    putCached(db, ctx, { kind: 'goal_suggestions', scopeKey: 'i1', payload: { goals: ['b'] } })
    expect(getCached(db, 'goal_suggestions', 'i1', 9_999)).toEqual({ goals: ['b'] })
  })
})

describe('stale plans', () => {
  it('abandons unfinished cards from earlier days only, leaving completed ones alone', () => {
    const { interest, goal } = interestWithGoal()
    const yesterdayUntouched = card(interest.id, goal.id, '2026-09-14')
    const yesterdayStarted = card(interest.id, goal.id, '2026-09-14')
    const yesterdayDone = card(interest.id, goal.id, '2026-09-14')
    const today = card(interest.id, goal.id, '2026-09-15')
    startActivity(db, ctx, yesterdayStarted.id)
    completeActivity(db, ctx, yesterdayDone.id)

    abandonStalePlans(db, ctx, { interestId: interest.id, before: '2026-09-15' })

    expect(getActivity(db, yesterdayUntouched.id)?.status).toBe('abandoned')
    expect(getActivity(db, yesterdayStarted.id)?.status).toBe('abandoned')
    expect(getActivity(db, yesterdayDone.id)?.status).toBe('completed')
    expect(getActivity(db, today.id)?.status).toBe('planned')
    expect(listPlannedForDate(db, interest.id, '2026-09-15')).toHaveLength(1)
  })
})
