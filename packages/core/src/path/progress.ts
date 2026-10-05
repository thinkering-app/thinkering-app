import { GOAL_STATUSES, type GoalStatus } from '../domain'

/**
 * Path's progress line (docs/01 §5): how many goals have reached at least each
 * status. Cumulative — a goal put to use also counts as introduced and
 * strengthened — so every number only grows as the learner does.
 */

export interface PathProgress {
  introduced: number
  strengthened: number
  applied: number
}

export function pathProgress(statuses: Iterable<GoalStatus>): PathProgress {
  const reached = (status: GoalStatus, floor: GoalStatus) =>
    GOAL_STATUSES.indexOf(status) >= GOAL_STATUSES.indexOf(floor)
  const progress: PathProgress = { introduced: 0, strengthened: 0, applied: 0 }
  for (const status of statuses) {
    if (reached(status, 'introduced')) progress.introduced++
    if (reached(status, 'strengthened')) progress.strengthened++
    if (reached(status, 'applied')) progress.applied++
  }
  return progress
}
