import type { ActivityDoc } from '../schemas/activity-doc'

/**
 * Concept coverage (D16, docs/03): which of a goal's concepts/skills have been
 * targeted by a completed activity. Derived, never stored — an activity
 * declares the goal concept ids it targets, and Path shows the union.
 */

export interface CoverageActivity {
  goalId: string | null
  doc: Pick<ActivityDoc, 'concepts'> | null
}

/** Covered concept ids per goal id. Ids not on the goal are simply not looked up. */
export function conceptCoverage(activities: readonly CoverageActivity[]): Map<string, Set<string>> {
  const coverage = new Map<string, Set<string>>()
  for (const activity of activities) {
    if (!activity.goalId || !activity.doc) continue
    const covered = coverage.get(activity.goalId) ?? new Set<string>()
    for (const concept of activity.doc.concepts) {
      if (concept.goalConceptId) covered.add(concept.goalConceptId)
    }
    coverage.set(activity.goalId, covered)
  }
  return coverage
}
