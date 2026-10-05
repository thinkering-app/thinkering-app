import { describe, expect, it } from 'vitest'
import type { ReflectUpdateOutput } from '../schemas/generations'
import {
  acceptAddition,
  acceptProposal,
  draftChanges,
  moveDraft,
  planReflection,
  type ReflectionGoal,
} from './reflection'

const GOALS: ReflectionGoal[] = [
  { id: 'a', title: 'A', description: 'a' },
  { id: 'b', title: 'B', description: 'b' },
  { id: 'c', title: 'C', description: 'c' },
]

function output(partial: Partial<ReflectUpdateOutput> = {}): ReflectUpdateOutput {
  return {
    observations: 'You want more speaking.',
    suggestedChanges: [],
    suggestedGoals: [],
    ...partial,
  }
}

describe('planReflection', () => {
  it('attaches proposals by ref and drops ones naming a goal that is not there', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedChanges: [
          { type: 'remove', ref: 'G2', reason: 'Covered elsewhere.' },
          { type: 'revise', ref: 'G9', title: 'X', description: 'x', reason: 'Nope.' },
          { type: 'reorder', ref: 'G3', afterRef: 'G7', reason: 'Nope either.' },
        ],
      }),
    )
    expect(plan.draft.map((g) => g.proposal?.kind ?? null)).toEqual([null, 'remove', null])
  })

  it('keeps one proposal per goal', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedChanges: [
          { type: 'remove', ref: 'G1', reason: 'First.' },
          { type: 'revise', ref: 'G1', title: 'A2', description: 'a2', reason: 'Second.' },
        ],
      }),
    )
    expect(plan.draft[0]!.proposal).toEqual({ kind: 'remove', reason: 'First.' })
  })

  it('places a suggested goal naming a goal that is not there at the end', () => {
    const goal = { title: 'D', description: 'd', concepts: [], reason: 'r.' }
    const plan = planReflection(GOALS, output({ suggestedGoals: [{ ...goal, afterRef: 'G9' }] }))
    expect(plan.additions[0]!.afterKey).toBe('c')
  })

  it('drops a reorder that would leave the goal where it is', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedChanges: [
          { type: 'reorder', ref: 'G1', afterRef: null, reason: 'Already first.' },
          { type: 'reorder', ref: 'G3', afterRef: 'G2', reason: 'Already there.' },
          { type: 'reorder', ref: 'G2', afterRef: 'G3', reason: 'A real move.' },
        ],
      }),
    )
    expect(plan.draft.map((g) => g.proposal?.kind ?? null)).toEqual([null, 'reorder', null])
  })
})

describe('accepting proposals', () => {
  it('reorders to the position the proposal asked for', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedChanges: [{ type: 'reorder', ref: 'G3', afterRef: null, reason: 'First.' }],
      }),
    )
    const after = acceptProposal(plan, 'c')
    expect(after.draft.map((g) => g.key)).toEqual(['c', 'a', 'b'])
    expect(after.draft[0]!.proposal).toBeNull()
  })

  it('inserts an added goal after the goal it named', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedGoals: [
          {
            title: 'Ask a question back',
            description: 'Keep it moving.',
            concepts: [{ label: 'W-questions', kind: 'concept' }],
            afterRef: 'G1',
            reason: 'Unfreezes the moment you described.',
          },
        ],
      }),
    )
    const after = acceptAddition(plan, 'add-0')
    expect(after.draft.map((g) => g.title)).toEqual(['A', 'Ask a question back', 'B', 'C'])
    expect(after.additions).toEqual([])
  })
})

describe('draftChanges', () => {
  it('summarises what the learner accepted', () => {
    const plan = planReflection(
      GOALS,
      output({
        suggestedChanges: [
          { type: 'remove', ref: 'G2', reason: 'Covered.' },
          { type: 'revise', ref: 'G1', title: 'A, revised', description: 'a', reason: 'Sharper.' },
        ],
        suggestedGoals: [
          {
            title: 'New one',
            description: 'd',
            concepts: [{ label: 'Something', kind: 'skill' }],
            afterRef: null,
            reason: 'r',
          },
        ],
      }),
    )
    const added = acceptAddition(acceptProposal(acceptProposal(plan, 'b'), 'a'), 'add-0')
    // Two moves: past the removed goal (which is not a reorder) and past A (which is).
    const accepted = moveDraft(moveDraft(added, 'c', -1), 'c', -1)
    expect(draftChanges(accepted, GOALS)).toEqual({
      added: ['New one'],
      removed: ['B'],
      revised: ['A, revised'],
      reordered: true,
    })
  })

  it('reports no reorder when the surviving goals keep their order', () => {
    const plan = planReflection(GOALS, output())
    expect(draftChanges(plan, GOALS).reordered).toBe(false)
  })
})
