import type { LocalDate } from '../scheduler/local-date'

/**
 * The Me calendar (docs/01 §7): a month of local dates, so the screen can mark
 * the days with completed activities without doing date arithmetic itself.
 * Everything here is pure UTC arithmetic over `YYYY-MM-DD` strings — the
 * timezone only matters when mapping an activity's `completed_at` to its local
 * date, which `localDateOf` already does.
 */

export interface YearMonth {
  year: number
  /** 1–12. */
  month: number
}

export interface CalendarDay {
  date: LocalDate
  /** False for the leading/trailing days that fill the grid's first and last week. */
  inMonth: boolean
}

const MS_PER_DAY = 86_400_000

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function yearMonthOf(date: LocalDate): YearMonth {
  const [year, month] = date.split('-').map(Number)
  return { year: year!, month: month! }
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = year * 12 + (month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 }
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month
}

/**
 * Weeks of seven days, Monday first, padded with the adjacent months' days so
 * every row is full.
 */
export function monthGrid(ym: YearMonth): CalendarDay[][] {
  const first = Date.UTC(ym.year, ym.month - 1, 1)
  // getUTCDay is 0=Sunday; the grid starts on Monday.
  const lead = (new Date(first).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(ym.year, ym.month, 0)).getUTCDate()
  const cells = Math.ceil((lead + days) / 7) * 7

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells; i++) {
    const at = first + (i - lead) * MS_PER_DAY
    const day: CalendarDay = {
      date: new Date(at).toISOString().slice(0, 10),
      inMonth: i >= lead && i < lead + days,
    }
    if (i % 7 === 0) weeks.push([])
    weeks.at(-1)!.push(day)
  }
  return weeks
}

/**
 * Epoch-ms bounds wide enough to contain every instant that could fall in this
 * month in any timezone — a day of slack either side. Callers narrow to the
 * exact local dates with `localDateOf`, which is what the grid is keyed on.
 */
export function monthBoundsMs(ym: YearMonth): { fromMs: number; toMs: number } {
  return {
    fromMs: Date.UTC(ym.year, ym.month - 1, 1) - MS_PER_DAY,
    toMs: Date.UTC(ym.year, ym.month, 1) + MS_PER_DAY,
  }
}
