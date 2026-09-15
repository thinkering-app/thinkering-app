import { localDateOf, type LocalDate } from '../scheduler/local-date'

/**
 * History and the calendar's day detail both group completed activities by the
 * device-local day they were completed on (D12) — newest day first, and newest
 * first within a day.
 */

export interface DayGroup<T> {
  date: LocalDate
  items: T[]
}

export function groupByLocalDay<T extends { completedAt: number | null }>(
  items: T[],
  timeZone: string,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  const byDate = new Map<LocalDate, DayGroup<T>>()
  const sorted = [...items].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  for (const item of sorted) {
    if (item.completedAt === null) continue
    const date = localDateOf(item.completedAt, timeZone)
    let group = byDate.get(date)
    if (!group) {
      group = { date, items: [] }
      byDate.set(date, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}
