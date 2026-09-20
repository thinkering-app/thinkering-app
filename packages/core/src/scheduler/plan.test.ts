import { describe, expect, it } from 'vitest'
import type { GoalStatus } from '../domain'
import { planToday, type CardPick, type SchedulerGoal } from './plan'

let seq = 0
function goal(
  id: string,
  status: GoalStatus,
  overrides: Partial<Omit<SchedulerGoal, 'id' | 'status'>> = {},
): SchedulerGoal {
  return {
    id,
    status,
    sortOrder: overrides.sortOrder ?? ++seq,
    introducedAt: overrides.introducedAt ?? (status === 'not_started' ? null : 1000),
    strengthenedAt:
      overrides.strengthenedAt ?? (status === 'strengthened' || status === 'applied' ? 2000 : null),
    appliedAt: overrides.appliedAt ?? (status === 'applied' ? 3000 : null),
  }
}

const goalIds = (picks: CardPick[]) => picks.map((p) => (p.kind === 'goal' ? p.goalId : p.kind))

describe('planToday', () => {
  it('brand-new path: Next introduces the first goal, strengthen falls back to prerequisites, go further targets the first goal', () => {
    const plan = planToday([
      goal('g1', 'not_started'),
      goal('g2', 'not_started'),
      goal('g3', 'not_started'),
      goal('g4', 'not_started'),
    ])
    expect(plan.next).toEqual([{ kind: 'goal', goalId: 'g1', tier: 'introduce' }])
    expect(plan.strengthen).toEqual([{ kind: 'prerequisite', tier: 'strengthen' }])
    expect(goalIds(plan.goFurther)).toEqual(['g1'])
    expect(plan.showReflectCard).toBe(false)
  })

  it('picks the first not_started goal by path order regardless of input order', () => {
    const g2 = goal('g2', 'not_started', { sortOrder: 2 })
    const g1 = goal('g1', 'not_started', { sortOrder: 1 })
    expect(goalIds(planToday([g2, g1]).next)).toEqual(['g1'])
  })

  it('strengthen prefers introduced-but-not-strengthened goals in path order', () => {
    const plan = planToday([
      goal('g1', 'strengthened'),
      goal('g2', 'introduced'),
      goal('g3', 'introduced'),
      goal('g4', 'not_started'),
    ])
    expect(goalIds(plan.strengthen)).toEqual(['g2'])
  })

  it('strengthen falls back to spaced review, least-recently-strengthened first', () => {
    const goals = [
      goal('g1', 'strengthened', { strengthenedAt: 5000 }),
      goal('g2', 'introduced'),
      goal('g3', 'applied', { strengthenedAt: 1000 }),
      goal('g4', 'strengthened', { strengthenedAt: 3000 }),
    ]
    // The introduced goal first; once the section has had it, the stalest
    // strengthened goal (g3, via applied status), then the next stalest.
    expect(goalIds(planToday(goals).strengthen)).toEqual(['g2'])
    expect(goalIds(planToday(goals, { exclude: { strengthen: ['g2'] } }).strengthen)).toEqual([
      'g3',
    ])
    expect(goalIds(planToday(goals, { exclude: { strengthen: ['g2', 'g3'] } }).strengthen)).toEqual(
      ['g4'],
    )
  })

  it('strengthen falls back to a prerequisite card once every eligible goal is excluded', () => {
    const goals = [goal('g1', 'introduced'), goal('g2', 'not_started')]
    expect(goalIds(planToday(goals).strengthen)).toEqual(['g1'])
    expect(planToday(goals, { exclude: { strengthen: ['g1'] } }).strengthen).toEqual([
      { kind: 'prerequisite', tier: 'strengthen' },
    ])
  })

  it('go further prefers strengthened-not-applied, then least-recently-applied, then introduced', () => {
    const goals = [
      goal('g1', 'applied', { appliedAt: 4000 }),
      goal('g2', 'strengthened'),
      goal('g3', 'applied', { appliedAt: 1000 }),
      goal('g4', 'introduced'),
    ]
    const pick = (exclude: string[]) =>
      goalIds(planToday(goals, { exclude: { go_further: exclude } }).goFurther)
    expect(pick([])).toEqual(['g2'])
    expect(pick(['g2'])).toEqual(['g3'])
    expect(pick(['g2', 'g3'])).toEqual(['g1'])
    expect(pick(['g1', 'g2', 'g3'])).toEqual(['g4'])
    expect(pick(['g1', 'g2', 'g3', 'g4'])).toEqual([])
  })

  it('exclusions are per section', () => {
    const goals = [goal('g1', 'not_started'), goal('g2', 'not_started')]
    expect(goalIds(planToday(goals, { exclude: { next: ['g1'] } }).next)).toEqual(['g2'])
    expect(goalIds(planToday(goals, { exclude: { next: ['g1'] } }).goFurther)).toEqual(['g1'])
  })

  it('all goals completed: no Next card, spaced review still fills strengthen and go further', () => {
    const plan = planToday([
      goal('g1', 'applied', { strengthenedAt: 1, appliedAt: 10 }),
      goal('g2', 'applied', { strengthenedAt: 2, appliedAt: 20 }),
    ])
    expect(plan.next).toEqual([])
    expect(goalIds(plan.strengthen)).toEqual(['g1'])
    expect(goalIds(plan.goFurther)).toEqual(['g1'])
    expect(plan.showReflectCard).toBe(true)
  })

  it('reflect card appears at ≤3 not_started goals and not before', () => {
    const started = [goal('a', 'introduced')]
    const notStarted = (n: number) =>
      Array.from({ length: n }, (_, i) => goal(`n${i}`, 'not_started'))
    expect(planToday([...started, ...notStarted(4)]).showReflectCard).toBe(false)
    expect(planToday([...started, ...notStarted(3)]).showReflectCard).toBe(true)
    expect(planToday([...started, ...notStarted(0)]).showReflectCard).toBe(true)
  })

  it('empty path: no cards beyond prerequisite padding, no reflect card', () => {
    const plan = planToday([])
    expect(plan.next).toEqual([])
    expect(goalIds(plan.goFurther)).toEqual([])
    expect(plan.showReflectCard).toBe(false)
  })

  it('is deterministic for identical input', () => {
    const goals = [goal('g1', 'introduced'), goal('g2', 'strengthened'), goal('g3', 'not_started')]
    expect(planToday(goals)).toEqual(planToday(goals.map((g) => ({ ...g }))))
  })
})
