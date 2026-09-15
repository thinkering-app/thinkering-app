import type { Section, Tier } from '../domain'
import { getLibraryItem } from '../library/items'

/**
 * The outcome line under a History row (docs/01 §6, D1): what the learner did
 * with the goal, in the wording the library item asked for. Go further items
 * carry their own label ("Put to use", "Went deeper on", "Branched out from");
 * the other two sections read from the tier.
 */

const TIER_LABEL: Record<Tier, string> = {
  introduce: 'Introduced',
  strengthen: 'Strengthened',
  apply: 'Put to use',
}

export interface OutcomeInput {
  section: Section
  tier: Tier
  libraryItemId: string
  /** The goal this targeted; the prerequisite card has a topic instead (docs/03). */
  goalTitle?: string | null
  topic?: string | null
}

export function outcomeLine(input: OutcomeInput): string {
  const item = getLibraryItem(input.libraryItemId)
  const verb =
    (input.section === 'go_further' ? item?.outcomeLabel : undefined) ?? TIER_LABEL[input.tier]
  const subject = input.goalTitle?.trim() || input.topic?.trim()
  return subject ? `${verb} ${subject}` : verb
}
