import type { LocalDate, WeekRhythm } from '@thinkering/core'

/**
 * What tapping Today's week dots says (docs/01 §3): the days learned this week,
 * then a line for where the week stands. Kept together so they can be read and
 * edited in one place. Sentence case, no exclamation marks (AGENTS.md §Minimal
 * user-facing text).
 */

const LINES = {
  /** A target, and nothing yet this week. No claims about time left: it may be Sunday. */
  fresh: [
    'A new week, ready when you are.',
    'One activity gets the week going.',
    'Any day is a good day to start.',
  ],
  /** Under way. */
  going: ['Nicely under way.', "It's adding up.", 'Good rhythm so far.', 'Steady does it.'],
  /** Exactly the target. */
  met: [
    'Week complete. Take a bow.',
    'You did what you set out to do.',
    'Every day you planned. Well done.',
    "That's the week. Your future self says thanks.",
  ],
  /** Past it. */
  beyond: [
    'Above and beyond.',
    'More than you planned. Lovely.',
    'Past your target, and still going.',
  ],
  /** No target. The dots only show once there's a day, so there's always one to celebrate. */
  open: [
    'Curiosity, followed.',
    'Learning on your own terms.',
    'Nicely done, on your own schedule.',
  ],
}

function weekStanding({ done, target }: WeekRhythm): keyof typeof LINES {
  if (target === null) return 'open'
  if (done === 0) return 'fresh'
  if (done < target) return 'going'
  return done === target ? 'met' : 'beyond'
}

function days(n: number): string {
  return n === 1 ? 'day' : 'days'
}

/** "2 of 5 days this week." — also the dots' accessibility label. */
export function weekCount({ done, target }: WeekRhythm): string {
  return target === null
    ? `${done} ${days(done)} this week.`
    : `${done} of ${target} ${days(target)} this week.`
}

/** The count and a line, stable for the day so tapping again doesn't reshuffle it. */
export function weekMessage(rhythm: WeekRhythm, today: LocalDate): string {
  const lines = LINES[weekStanding(rhythm)]
  let hash = 0
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) | 0
  return `${weekCount(rhythm)} ${lines[Math.abs(hash) % lines.length]}`
}
