import { useCallback, useMemo, useReducer, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  localDateOf,
  monthBoundsMs,
  shiftMonth,
  yearMonthOf,
  type LocalDate,
  type YearMonth,
} from '@thinkering/core'
import { listCompletedBetween, type HistoryRow } from '@thinkering/db'

import { db } from '@/db'
import { deviceTimeZone } from '@/time'

/**
 * The Me calendar's month (docs/01 §7): which local days have completed
 * activities, and what a tapped day contains. One query per month, keyed on the
 * month the user is looking at.
 */

export interface CalendarView {
  month: YearMonth
  /** Local dates in view with at least one completed activity. */
  marked: Set<LocalDate>
  changeMonth: (delta: number) => void
  dayActivities: (date: LocalDate) => HistoryRow[]
}

export function useCalendar(today: LocalDate): CalendarView {
  const [month, setMonth] = useState<YearMonth>(() => yearMonthOf(today))
  const [version, refresh] = useReducer((n: number) => n + 1, 0)
  useFocusEffect(useCallback(() => refresh(), []))

  const byDate = useMemo(() => {
    const timeZone = deviceTimeZone()
    const groups = new Map<LocalDate, HistoryRow[]>()
    // The query is newest-first; a day reads chronologically (docs/01 §7).
    for (const row of listCompletedBetween(db, monthBoundsMs(month))) {
      const date = localDateOf(row.completedAt, timeZone)
      const day = groups.get(date)
      if (day) day.unshift(row)
      else groups.set(date, [row])
    }
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  }, [month, version])

  return {
    month,
    marked: useMemo(() => new Set(byDate.keys()), [byDate]),
    changeMonth: useCallback((delta: number) => setMonth((m) => shiftMonth(m, delta)), []),
    dayActivities: useCallback((date: LocalDate) => byDate.get(date) ?? [], [byDate]),
  }
}
