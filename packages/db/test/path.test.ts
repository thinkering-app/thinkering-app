import { beforeEach, describe, expect, it } from 'vitest'
import { conceptCoverage } from '@thinkering/core'
import {
  completeActivity,
  createActivity,
  createGoal,
  createInterest,
  attachDoc,
  listCoverage,
  listGoals,
  moveGoal,
  nextGoalSortOrder,
} from '../src'
import type { Database } from '../src/database'
import { FIXTURE_DOC_INTRODUCE } from '@thinkering/core'
import { openTestDb, testContext } from './helpers'

let db: Database
let ctx: ReturnType<typeof testContext>
let interestId: string

beforeEach(() => {
  ;({ db } = openTestDb())
  ctx = testContext()
  interestId = createInterest(db, ctx, {
    name: 'Understanding LLMs',
    wantToLearn: 'Understand LLMs and AI',
    whyChoice: 'career',
    experienceChoice: 'explored',
    frequency: 'daily',
    sessionMinutes: 10,
    status: 'focus',
    sortOrder: 1,
  }).id
})

function makePath(titles: string[]) {
  return titles.map((title, i) =>
    createGoal(db, ctx, {
      interestId,
      title,
      description: `${title} description`,
      concepts: [{ id: `c-${i}`, label: `Concept ${i}`, kind: 'concept' }],
      sortOrder: nextGoalSortOrder(db, interestId),
      source: 'intake',
    }),
  )
}

const titlesInOrder = () => listGoals(db, interestId).map((g) => g.title)

describe('moveGoal', () => {
  it('reorders to the front, the middle and the end', () => {
    makePath(['A', 'B', 'C', 'D'])
    const byTitle = (t: string) => listGoals(db, interestId).find((g) => g.title === t)!.id

    moveGoal(db, ctx, byTitle('D'), 0)
    expect(titlesInOrder()).toEqual(['D', 'A', 'B', 'C'])

    moveGoal(db, ctx, byTitle('D'), 2)
    expect(titlesInOrder()).toEqual(['A', 'B', 'D', 'C'])

    moveGoal(db, ctx, byTitle('A'), 99)
    expect(titlesInOrder()).toEqual(['B', 'D', 'C', 'A'])
  })

  it('survives repeated moves into the same slot (order precision)', () => {
    makePath(['A', 'B', 'C'])
    const byTitle = (t: string) => listGoals(db, interestId).find((g) => g.title === t)!.id
    // Each move halves the gap; past ~50 the midpoint collapses and the path renumbers.
    for (let i = 0; i < 80; i++) {
      moveGoal(db, ctx, byTitle('C'), 1)
      moveGoal(db, ctx, byTitle('B'), 1)
    }
    expect(titlesInOrder()).toEqual(['A', 'B', 'C'])
    expect(new Set(listGoals(db, interestId).map((g) => g.sortOrder)).size).toBe(3)
  })
})

describe('listCoverage', () => {
  it('reports only completed activities, feeding per-goal concept coverage', () => {
    const [goal] = makePath(['Explain what a token is'])
    const doc = {
      ...FIXTURE_DOC_INTRODUCE,
      concepts: [{ goalConceptId: 'c-0', label: 'Concept 0' }],
    }
    const make = () =>
      createActivity(db, ctx, {
        interestId,
        goalId: goal!.id,
        section: 'next',
        tier: 'introduce',
        libraryItemId: 'plain-explainer',
        title: 'Tokens, not words',
        estMinutes: 10,
        plannedFor: '2026-09-15',
      })

    const unfinished = make()
    attachDoc(db, ctx, unfinished.id, doc)
    expect(listCoverage(db, interestId)).toEqual([])

    const done = make()
    attachDoc(db, ctx, done.id, doc)
    completeActivity(db, ctx, done.id)
    expect([...(conceptCoverage(listCoverage(db, interestId)).get(goal!.id) ?? [])]).toEqual([
      'c-0',
    ])
  })
})
