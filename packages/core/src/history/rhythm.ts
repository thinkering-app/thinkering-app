import type { Frequency } from '../domain'
import type { LocalDate } from '../scheduler/local-date'

/**
 * The weekly rhythm (docs/01 §3, §7): how many days this week an interest was
 * practiced against its weekly target, and how many weeks in a row
 * the learner has done anything at all. Weeks run Monday to Sunday, like the
 * calendar grid. Pure arithmetic over `YYYY-MM-DD` strings; callers map
 * `completed_at` to local dates with `localDateOf`.
 */

const MS_PER_DAY = 86_400_000

/** Days a week each frequency aims for until the learner picks; "when I can" has no target. */
export const WEEKLY_TARGET: Record<Frequency, number | null> = {
  daily: 5,
  several_weekly: 3,
  when_i_can: null,
}

/** The days the learner chose in Configure learning routine (0 is no target), else the frequency's. */
export function weeklyTarget(interest: {
  frequency: Frequency
  weeklyDays: number | null
}): number | null {
  if (interest.weeklyDays === null) return WEEKLY_TARGET[interest.frequency]
  return interest.weeklyDays === 0 ? null : interest.weeklyDays
}

function utcMs(date: LocalDate): number {
  return Date.parse(`${date}T00:00:00Z`)
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The Monday of the week containing `date`. */
export function weekStartOf(date: LocalDate): LocalDate {
  const ms = utcMs(date)
  // getUTCDay is 0=Sunday; weeks start on Monday.
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7
  return fromUtcMs(ms - sinceMonday * MS_PER_DAY)
}

/**
 * Epoch-ms bounds wide enough to contain every instant of the week containing
 * `date` in any timezone — a day of slack either side, like `monthBoundsMs`.
 */
export function weekBoundsMs(date: LocalDate): { fromMs: number; toMs: number } {
  const start = utcMs(weekStartOf(date))
  return { fromMs: start - MS_PER_DAY, toMs: start + 8 * MS_PER_DAY }
}

export interface WeekRhythm {
  /** Distinct days practiced this week, up to and including today. */
  done: number
  /** Whether today is one of them: the last filled dot gets a check. */
  doneToday: boolean
  target: number | null
}

export function weekRhythm(
  activeDates: Iterable<LocalDate>,
  today: LocalDate,
  target: number | null,
): WeekRhythm {
  const start = weekStartOf(today)
  const days = new Set<LocalDate>()
  for (const date of activeDates) if (date >= start && date <= today) days.add(date)
  return { done: days.size, doneToday: days.has(today), target }
}

/**
 * Weeks in a row with at least one active day, counting back from this week.
 * This week only adds once it has a day, and never breaks the run while it's
 * still going — on a Monday morning, last week's run still stands.
 */
export function weeklyStreak(activeDates: Iterable<LocalDate>, today: LocalDate): number {
  const weeks = new Set<LocalDate>()
  for (const date of activeDates) if (date <= today) weeks.add(weekStartOf(date))

  let week = utcMs(weekStartOf(today))
  if (!weeks.has(fromUtcMs(week))) week -= 7 * MS_PER_DAY
  let streak = 0
  while (weeks.has(fromUtcMs(week))) {
    streak++
    week -= 7 * MS_PER_DAY
  }
  return streak
}
