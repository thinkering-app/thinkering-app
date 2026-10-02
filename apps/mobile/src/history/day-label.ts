import { localDateOf, type LocalDate, type YearMonth } from '@thinkering/core'

import { currentFormatLocale, t } from '@/i18n'

/**
 * Day and month headings in History and the calendar. Local dates are parsed as
 * UTC midnight and formatted in UTC, so the label always names the date string
 * it was given, whatever the device's timezone.
 */

const MS_PER_DAY = 86_400_000

export function dayLabel(date: LocalDate, today: LocalDate): string {
  if (date === today) return t('history.today')
  if (date === localDateOf(Date.parse(`${today}T00:00:00Z`) - MS_PER_DAY, 'UTC'))
    return t('history.yesterday')
  return new Intl.DateTimeFormat(currentFormatLocale(), {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    // The year only earns its place once it isn't the current one.
    ...(date.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  }).format(new Date(`${date}T00:00:00Z`))
}

export function monthHeading(ym: YearMonth, today: LocalDate): string {
  return new Intl.DateTimeFormat(currentFormatLocale(), {
    timeZone: 'UTC',
    month: 'long',
    ...(String(ym.year) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  }).format(new Date(Date.UTC(ym.year, ym.month - 1, 1)))
}
