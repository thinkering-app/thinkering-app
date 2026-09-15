import { useCallback, useMemo, useReducer, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { groupByLocalDay, type DayGroup } from '@thinkering/core'
import { listHistoryPage, type HistoryRow } from '@thinkering/db'

import { db } from '@/db'
import { deviceTimeZone } from '@/time'

/**
 * History's read model (docs/01 §6): completed activities grouped by the local
 * day they were finished, a page at a time. Reads are synchronous SQLite, so
 * the page is derived rather than cached — paging just raises the limit.
 */

/** Enough rows to cover the ~5 recent active days the screen opens with. */
const PAGE_SIZE = 20

export interface HistoryView {
  days: DayGroup<HistoryRow>[]
  /** A full page came back, so there may be more behind it. */
  hasMore: boolean
  loadMore: () => void
}

/**
 * `interestIds` is the current selection — one interest, every exploring one
 * for Explore → All, or undefined for "no filter".
 */
export function useHistory(interestIds: string[] | undefined): HistoryView {
  const key = interestIds?.join(',') ?? 'all'
  // Switching interest starts paging over, without an effect to reset it.
  const [paging, setPaging] = useState({ key, limit: PAGE_SIZE })
  const limit = paging.key === key ? paging.limit : PAGE_SIZE
  // A completed activity can land while the tab is mounted.
  const [version, refresh] = useReducer((n: number) => n + 1, 0)
  useFocusEffect(useCallback(() => refresh(), []))

  const rows = useMemo(
    () => listHistoryPage(db, { interestIds, limit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the id list is compared by value; `version` is the re-read trigger
    [key, limit, version],
  )
  const days = useMemo(() => groupByLocalDay(rows, deviceTimeZone()), [rows])

  return {
    days,
    hasMore: rows.length === limit,
    loadMore: useCallback(() => setPaging({ key, limit: limit + PAGE_SIZE }), [key, limit]),
  }
}
