import { useCallback, useMemo, useReducer } from 'react'
import { useFocusEffect } from 'expo-router'
import { conceptCoverage, pathProgress, type PathProgress } from '@thinkering/core'
import { listCoverage, listGoals, type Goal, type Interest } from '@thinkering/db'

import { db } from '@/db'
import { useInterestSelection } from '@/interests/selection'

/**
 * Path's read model (docs/01 §5). Reads are synchronous SQLite, so the screen
 * re-reads on focus and after every edit rather than holding a cache.
 */

export interface PathGoalView {
  goal: Goal
  /** Concept ids a completed activity has targeted (D16) — derived, never stored. */
  covered: Set<string>
}

export interface PathView {
  goals: PathGoalView[]
  /** Goals at each status and the interest's completed activities — the line under the goals. */
  progress: PathProgress & { activities: number }
  reload: () => void
}

/**
 * Path shows one interest at a time — it has no "All" (docs/01 §2). An Explore
 * selection that means "all exploring interests" resolves to the first of them.
 */
export function usePathInterest(): Interest | null {
  const { selected, exploring } = useInterestSelection()
  return selected[0] ?? exploring[0] ?? null
}

export function usePath(interest: Interest | null): PathView {
  const [version, reload] = useReducer((n: number) => n + 1, 0)
  useFocusEffect(useCallback(() => reload(), []))

  const { goals, progress } = useMemo(() => {
    if (!interest) return { goals: [], progress: { ...pathProgress([]), activities: 0 } }
    // Every completed activity of the interest, with or without a goal still on the path.
    const completed = listCoverage(db, interest.id)
    const coverage = conceptCoverage(completed)
    const goals = listGoals(db, interest.id).map((goal) => ({
      goal,
      covered: coverage.get(goal.id) ?? new Set<string>(),
    }))
    const progress = {
      ...pathProgress(goals.map((g) => g.goal.status)),
      activities: completed.length,
    }
    return { goals, progress }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  }, [interest?.id, version])

  return { goals, progress, reload }
}
