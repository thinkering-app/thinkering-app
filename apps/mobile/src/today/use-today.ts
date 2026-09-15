import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  completedTodayBySection,
  localDateOf,
  planToday,
  SECTIONS,
  type LocalDate,
  type Section,
} from '@thinkering/core'
import {
  listHistory,
  listPlannedForDate,
  schedulerGoals,
  type Activity,
  type Goal,
  type Interest,
} from '@thinkering/db'
import { listGoals } from '@thinkering/db'

import { describeAiError } from '@/ai'
import { db } from '@/db'
import { prefetchNextActivity } from '@/features/activity-player/generate'
import { ensureDailyPlan, hasPlanFor } from './plan'

/**
 * Today's read model and the G5a kick-off behind it. Reads are synchronous
 * SQLite, so the screen re-reads on focus (returning from an activity changes
 * completion state) rather than holding a cache.
 */

export interface TodayCardView {
  activity: Activity
  /** The goal this card moves, or the prerequisite topic when it has no goal yet. */
  goalLine: string
  /** Shown only when several interests share the list (Explore → All). */
  interestName?: string
}

export interface TodaySectionView {
  section: Section
  cards: TodayCardView[]
  completedToday: number
}

/** An interest with three or fewer unstarted goals left — time to reflect (docs/01 §3). */
export interface ReflectPrompt {
  interestId: string
  interestName?: string
}

export interface TodayView {
  today: LocalDate
  sections: TodaySectionView[]
  /** Shown in Next, from the scheduler's `showReflectCard`. */
  reflect: ReflectPrompt[]
  /** No goals yet in any selected interest — nothing to plan. */
  empty: boolean
  generating: boolean
  error: string | null
  retry: () => void
  refresh: () => void
}

const HISTORY_LOOKBACK = 30

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function useToday(interests: Interest[]): TodayView {
  const timeZone = deviceTimeZone()
  const [version, bump] = useReducer((n: number) => n + 1, 0)
  const [today, setToday] = useState<LocalDate>(() => localDateOf(Date.now(), timeZone))
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = interests.map((i) => i.id).join(',')

  // Coming back to Today can mean a completed activity, or a new day.
  useFocusEffect(
    useCallback(() => {
      setToday(localDateOf(Date.now(), timeZone))
      bump()
    }, [timeZone]),
  )

  useEffect(() => {
    const missing = interests.filter(
      (i) => !hasPlanFor(i.id, today) && listGoals(db, i.id).length > 0,
    )
    if (missing.length === 0) return

    let cancelled = false
    const controller = new AbortController()
    const run = async () => {
      setGenerating(true)
      setError(null)
      try {
        // Sequential: the plan for each interest is a separate cheap call, and
        // firing them together only makes the meter spike.
        for (const interest of missing) await ensureDailyPlan(interest, today, controller.signal)
        if (cancelled) return
        setGenerating(false)
        bump()
        for (const interest of missing) {
          prefetchNextActivity(listPlannedForDate(db, interest.id, today), controller.signal)
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted) return
        setGenerating(false)
        setError(describeAiError(e))
      }
    }
    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
    // `key` stands in for the interest list; `version` re-checks after a plan lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, today, version])

  const sections = useMemo(
    () => readSections(interests, today, timeZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, today, timeZone, version],
  )

  const reflect = useMemo(
    () =>
      interests.flatMap((interest) =>
        planToday(schedulerGoals(db, interest.id)).showReflectCard
          ? [
              {
                interestId: interest.id,
                interestName: interests.length > 1 ? interest.name : undefined,
              },
            ]
          : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, version],
  )

  const empty = interests.length === 0 || interests.every((i) => listGoals(db, i.id).length === 0)

  return { today, sections, reflect, empty, generating, error, retry: bump, refresh: bump }
}

function readSections(
  interests: Interest[],
  today: LocalDate,
  timeZone: string,
): TodaySectionView[] {
  const showInterestName = interests.length > 1
  const cards: TodayCardView[] = []
  // Keyed by activity id: today's cards and recent history overlap, and each
  // completed activity must count once.
  const completed = new Map<string, { section: Section; completedAt: number | null }>()

  for (const interest of interests) {
    const goals = new Map(listGoals(db, interest.id).map((g: Goal) => [g.id, g]))
    for (const activity of listPlannedForDate(db, interest.id, today)) {
      if (activity.status === 'abandoned') continue
      cards.push({
        activity,
        goalLine: goalLineFor(activity, goals),
        interestName: showInterestName ? interest.name : undefined,
      })
      completed.set(activity.id, { section: activity.section, completedAt: activity.completedAt })
    }
    // Something planned earlier but finished today still counts for today.
    for (const done of listHistory(db, { interestId: interest.id, limit: HISTORY_LOOKBACK })) {
      completed.set(done.id, { section: done.section, completedAt: done.completedAt })
    }
  }

  const counts = completedTodayBySection([...completed.values()], { today, timeZone })
  return SECTIONS.map((section) => ({
    section,
    cards: cards.filter((c) => c.activity.section === section),
    completedToday: counts[section],
  }))
}

function goalLineFor(activity: Activity, goals: Map<string, Goal>): string {
  if (activity.goalId) return goals.get(activity.goalId)?.title ?? ''
  return activity.topic ?? 'A foundation for your path'
}
