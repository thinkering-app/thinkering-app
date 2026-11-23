import type { Tier } from '@thinkering/core'

import { t } from '@/i18n'

/**
 * The words the summary page adds around G5b's recap (docs/05), kept together
 * so they can be read and edited in one place. Sentence case, no exclamation
 * marks (AGENTS.md §Minimal user-facing text). Copy lives in
 * `src/i18n/locales/en/player.ts`; this file only picks which key applies.
 */

/** The line under the heading, before the goal's title — one `<Trans>` key per tier. */
export const GOAL_LINE_KEY = {
  introduce: 'player.summary.goalLine.introduce',
  strengthen: 'player.summary.goalLine.strengthen',
  apply: 'player.summary.goalLine.apply',
} as const satisfies Record<Tier, string>

/** Stable per activity, so coming back to the summary doesn't change the line. */
export function celebrationFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  const celebrations = t('player.summary.celebrations', { returnObjects: true })
  return celebrations[Math.abs(hash) % celebrations.length]!
}
