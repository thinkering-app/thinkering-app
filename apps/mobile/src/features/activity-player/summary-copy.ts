import type { Tier } from '@thinkering/core'

/**
 * The words the summary page adds around G5b's recap (docs/05), kept together
 * so they can be read and edited in one place. Sentence case, no exclamation
 * marks (AGENTS.md §Minimal user-facing text).
 */

/** The heading. One is picked per activity and stays the same on every visit. */
export const CELEBRATIONS = [
  'Nicely done.',
  'Good work.',
  "That's a wrap.",
  'Another one down.',
  'Well earned.',
  'Brain, slightly upgraded.',
  'Look at you, learning things.',
  'Neurons: rewired.',
]

/** The line under the heading, before the goal's title: "You learned <goal>." */
export const GOAL_VERB: Record<Tier, string> = {
  introduce: 'You learned',
  strengthen: 'You strengthened',
  apply: 'You went further on',
}

/** Stable per activity, so coming back to the summary doesn't change the line. */
export function celebrationFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return CELEBRATIONS[Math.abs(hash) % CELEBRATIONS.length]!
}
