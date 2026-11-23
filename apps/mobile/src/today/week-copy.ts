import type { LocalDate, WeekRhythm } from '@thinkering/core'

import { t } from '@/i18n'

/**
 * What tapping Today's week dots says (docs/01 §3): the days learned this week,
 * then a line for where the week stands. The copy is in `today.week` in
 * `src/i18n/locales/en/today.ts`; this file only picks which line applies.
 */

type Standing = 'fresh' | 'going' | 'met' | 'beyond' | 'open'

function weekStanding({ done, target }: WeekRhythm): Standing {
  if (target === null) return 'open'
  if (done === 0) return 'fresh'
  if (done < target) return 'going'
  return done === target ? 'met' : 'beyond'
}

/** "2 of 5 days this week." — also the dots' accessibility label. */
export function weekCount({ done, target }: WeekRhythm): string {
  return target === null
    ? t('today.week.count', { count: done })
    : t('today.week.countOfTarget', { count: done, target })
}

/** The count and a line, stable for the day so tapping again doesn't reshuffle it. */
export function weekMessage(rhythm: WeekRhythm, today: LocalDate): string {
  const lines = t(`today.week.${weekStanding(rhythm)}`, { returnObjects: true })
  let hash = 0
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) | 0
  return `${weekCount(rhythm)} ${lines[Math.abs(hash) % lines.length]}`
}
