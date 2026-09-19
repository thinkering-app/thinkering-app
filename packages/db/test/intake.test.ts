import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_INTAKE_ANSWERS } from '@thinkering/core'
import {
  clearIntakeDraft,
  getIntakeDraft,
  getSetting,
  listGoals,
  listTopics,
  nextInterestSortOrder,
  saveIntake,
  saveIntakeDraft,
  setSetting,
  softDeleteInterest,
  softDeleteTopic,
  type SaveIntakeInput,
} from '../src'
import type { Database } from '../src/database'
import { openTestDb, testContext } from './helpers'

let db: Database
let ctx: ReturnType<typeof testContext>

beforeEach(() => {
  ;({ db } = openTestDb())
  ctx = testContext()
})

const INPUT: SaveIntakeInput = {
  name: 'Conversational German',
  wantToLearn: 'Get conversational in German',
  whyChoice: 'personal_goal',
  whyText: 'Family in Vienna.',
  experienceChoice: 'explored',
  frequency: 'several_weekly',
  sessionMinutes: 10,
  approachNotes: 'Comprehensible input first; delay explicit grammar.',
  status: 'focus',
  topics: [
    { label: 'Ordering food', origin: 'motivation', selected: true },
    { label: 'Noun gender', origin: 'foundational', selected: false },
  ],
  goals: [
    {
      title: 'Order in a café',
      description: 'The phrases that carry a whole transaction.',
      concepts: [
        { label: 'Polite requests', kind: 'skill' },
        { label: 'Café vocabulary', kind: 'concept' },
      ],
    },
    {
      title: 'Read a simple menu',
      description: 'Food words and the grammar holding them together.',
      concepts: [{ label: 'Noun gender', kind: 'concept' }],
    },
  ],
}

describe('saveIntake', () => {
  it('writes the interest, topics in offer order, and the path in sequence order', () => {
    const { interest, goals } = saveIntake(db, ctx, INPUT)

    expect(interest.name).toBe('Conversational German')
    expect(interest.status).toBe('focus')
    expect(interest.sortOrder).toBe(1)
    expect(listTopics(db, interest.id).map((t) => [t.label, t.selected])).toEqual([
      ['Ordering food', true],
      ['Noun gender', false],
    ])
    expect(listGoals(db, interest.id).map((g) => g.title)).toEqual(goals.map((g) => g.title))
    expect(goals.map((g) => g.status)).toEqual(['not_started', 'not_started'])
    expect(goals.every((g) => g.source === 'intake')).toBe(true)
  })

  it('assigns a distinct stable id to every goal concept (D16)', () => {
    const { goals } = saveIntake(db, ctx, INPUT)
    const ids = goals.flatMap((g) => g.concepts.map((c) => c.id))
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(goals[0]!.concepts.map((c) => c.kind)).toEqual(['skill', 'concept'])
  })

  it('sorts a second interest after the first, and after a soft-deleted one', () => {
    const first = saveIntake(db, ctx, INPUT).interest
    softDeleteInterest(db, ctx, first.id)
    expect(nextInterestSortOrder(db)).toBe(1) // deleted interests free their slot
    const second = saveIntake(db, ctx, { ...INPUT, name: 'Chess' }).interest
    const third = saveIntake(db, ctx, { ...INPUT, name: 'Drawing' }).interest
    expect([second.sortOrder, third.sortOrder]).toEqual([1, 2])
  })

  it('hides soft-deleted topics from the interest', () => {
    const { interest } = saveIntake(db, ctx, INPUT)
    softDeleteTopic(db, ctx, listTopics(db, interest.id)[0]!.id)
    expect(listTopics(db, interest.id).map((t) => t.label)).toEqual(['Noun gender'])
  })
})

describe('intake draft', () => {
  it('keeps one draft until it is cleared', () => {
    const draft = {
      answers: { ...EMPTY_INTAKE_ANSWERS, wantToLearn: 'Chess' },
      step: 2,
      updatedAt: 1,
    }
    saveIntakeDraft(db, draft)
    saveIntakeDraft(db, { ...draft, step: 3 })
    expect(getIntakeDraft(db)).toEqual({ ...draft, step: 3 })
    clearIntakeDraft(db)
    expect(getIntakeDraft(db)).toBeUndefined()
  })

  it('clears a draft an older build wrote in a shape it no longer reads', () => {
    setSetting(db, 'intake_draft', { answers: { learn: 'Chess' }, step: 2 })
    expect(getIntakeDraft(db)).toBeUndefined()
    expect(getSetting(db, 'intake_draft')).toBeUndefined()
  })
})
