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
import { schedulerGoals, type Activity, type Goal, type Interest } from '@thinkering/db'
import { listGoals } from '@thinkering/db'

import { describeAiError } from '@/ai'
import { db } from '@/db'
import { deviceTimeZone } from '@/time'
import { useWritingDocs, writeAhead, type WritingDocs } from '@/features/activity-player/generate'
import { ensureDailyPlan, needsCards, suggestedInterests, todaysCards } from './plan'

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
  /** Cards whose documents are queued or being written, and which of them can be opened. */
  writing: WritingDocs
  error: string | null
  retry: () => void
  refresh: () => void
}

export function useToday(
  interests: Interest[],
  opts: {
    /** Explore → All: suggest from a couple of interests, without writing ahead. */
    suggestOnly: boolean
  },
): TodayView {
  const timeZone = deviceTimeZone()
  const [version, bump] = useReducer((n: number) => n + 1, 0)
  const [today, setToday] = useState<LocalDate>(() => localDateOf(Date.now(), timeZone))
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const writing = useWritingDocs()
  const selectedKey = interests.map((i) => i.id).join(',')
  // Explore → All suggests from a couple of interests, fixed for the day.
  const shown = useMemo(
    () => (opts.suggestOnly ? suggestedInterests(interests, today) : interests),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedKey, opts.suggestOnly, today],
  )
  const key = shown.map((i) => i.id).join(',')

  // Coming back to Today can mean a completed activity — whose section then
  // wants its next card — or a new day.
  useFocusEffect(
    useCallback(() => {
      setToday(localDateOf(Date.now(), timeZone))
      bump()
    }, [timeZone]),
  )

  useEffect(() => {
    // Only Next is written ahead (docs/04 §Latency & cost): it is the card a
    // day usually starts with, and writing all three spent an activity
    // document — the app's most expensive call — on two cards most days never
    // open. The rest offer Write. Explore → All writes nothing ahead at all.
    // The writes outlive this effect on purpose.
    const writeAheadFor = (list: Interest[]) => {
      if (opts.suggestOnly) return
      for (const interest of list) {
        writeAhead(todaysCards(interest.id, today).filter((a) => a.section === 'next'))
      }
    }
    const waiting = shown.filter((i) => needsCards(i.id, today))
    if (waiting.length === 0) {
      writeAheadFor(shown)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const run = async () => {
      setGenerating(true)
      setError(null)
      try {
        // Sequential: the plan for each interest is a separate cheap call, and
        // firing them together only makes the meter spike.
        for (const interest of waiting) await ensureDailyPlan(interest, today, controller.signal)
        writeAheadFor(shown)
        if (cancelled) return
        setGenerating(false)
        bump()
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
  }, [key, today, version, opts.suggestOnly])

  // A write changes what a card offers as it goes (Write → Writing → its
  // time), so a change in `writing` re-reads too.
  const sections = useMemo(
    () => readSections(shown, today, timeZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, today, timeZone, version, writing],
  )

  const reflect = useMemo(
    () =>
      shown.flatMap((interest) =>
        planToday(schedulerGoals(db, interest.id)).showReflectCard
          ? [
              {
                interestId: interest.id,
                interestName: shown.length > 1 ? interest.name : undefined,
              },
            ]
          : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, version],
  )

  const empty = shown.length === 0 || shown.every((i) => listGoals(db, i.id).length === 0)

  return {
    today,
    sections,
    reflect,
    empty,
    generating,
    writing,
    error,
    retry: bump,
    refresh: bump,
  }
}

function readSections(
  interests: Interest[],
  today: LocalDate,
  timeZone: string,
): TodaySectionView[] {
  const showInterestName = interests.length > 1
  const cards: TodayCardView[] = []

  for (const interest of interests) {
    const goals = new Map(listGoals(db, interest.id).map((g: Goal) => [g.id, g]))
    for (const activity of todaysCards(interest.id, today)) {
      cards.push({
        activity,
        goalLine: goalLineFor(activity, goals),
        interestName: showInterestName ? interest.name : undefined,
      })
    }
  }

  const counts = completedTodayBySection(
    cards.map((c) => c.activity),
    { today, timeZone },
  )
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
