import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  pathSignature,
  type GeneratedGoal,
  type PathSuggestGoalsParams,
  type SuggestedGoalsOutput,
} from '@thinkering/core'
import {
  createGoal,
  getCachedUnexpiring,
  listTopics,
  nextGoalSortOrder,
  putCached,
  type Goal,
  type Interest,
} from '@thinkering/db'

import { callAi, describeAiError } from '@/ai'
import { interestContext } from '@/ai/context'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'

/**
 * The three suggested goals at the bottom of Path (G9, docs/01 §5). Cached in
 * `gen_cache` under the path's signature, so re-opening Path is free and a
 * changed path is what makes them stale.
 */

const CACHE_KIND = 'goal_suggestions'

export interface SuggestionsView {
  suggestions: GeneratedGoal[]
  pending: boolean
  error: string | null
  /** Appends a suggestion to the path; the changed path invalidates the cache. */
  accept: (goal: GeneratedGoal) => Goal
  retry: () => void
}

/** A finished attempt at one path signature — served from cache or generated. */
interface Attempt {
  key: string
  goals: GeneratedGoal[]
  error: string | null
}

export function useSuggestions(interest: Interest | null, goals: Goal[]): SuggestionsView {
  const scopeKey = interest && goals.length > 0 ? `${interest.id}:${pathSignature(goals)}` : ''
  const [attemptNo, setAttemptNo] = useState(0)
  const [attempt, setAttempt] = useState<Attempt | null>(null)

  // A synchronous SQLite read, so the cached case never renders a wait under
  // suggestions we already have.
  const cached = useMemo(
    () => (scopeKey ? getCachedUnexpiring<GeneratedGoal[]>(db, CACHE_KIND, scopeKey) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a retry re-reads the cache
    [scopeKey, attemptNo],
  )

  useEffect(() => {
    if (!interest || !scopeKey || cached) return

    let cancelled = false
    const controller = new AbortController()
    const params: PathSuggestGoalsParams = {
      context: interestContext(interest, goals),
      sessionMinutes: interest.sessionMinutes,
      topics: listTopics(db, interest.id)
        .filter((t) => t.selected)
        .map((t) => t.label),
    }
    callAi<SuggestedGoalsOutput>('path.suggestGoals', params, {
      interestId: interest.id,
      signal: controller.signal,
    })
      .then(({ output }) => {
        if (cancelled) return
        putCached(db, repoContext, { kind: CACHE_KIND, scopeKey, payload: output.goals })
        setAttempt({ key: scopeKey, goals: output.goals, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled || controller.signal.aborted) return
        setAttempt({ key: scopeKey, goals: [], error: describeAiError(e) })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey stands in for the path
  }, [scopeKey, attemptNo, cached])

  const settled = cached ? { key: scopeKey, goals: cached, error: null } : attempt
  const current = settled?.key === scopeKey ? settled : null

  const accept = useCallback(
    (suggestion: GeneratedGoal) => {
      if (!interest) throw new Error('no interest selected')
      track('goal_added', { source: 'suggestion' })
      return createGoal(db, repoContext, {
        interestId: interest.id,
        title: suggestion.title,
        description: suggestion.description,
        concepts: suggestion.concepts.map((c) => ({
          id: repoContext.newId(),
          label: c.label,
          kind: c.kind,
        })),
        sortOrder: nextGoalSortOrder(db, interest.id),
        source: 'suggestion',
      })
    },
    [interest],
  )

  return {
    suggestions: current?.goals ?? [],
    pending: scopeKey !== '' && current === null,
    error: current?.error ?? null,
    accept,
    retry: () => setAttemptNo((n) => n + 1),
  }
}
