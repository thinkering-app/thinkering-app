import type { Section, Tier } from '../domain'
import { getLibraryItem } from '../library/items'

/**
 * The outcome line under a History row (docs/01 §6, D1): what the learner did
 * with the goal, in the wording the library item asked for. Go further items
 * carry their own label ("Put to use", "Went deeper on", "Branched out from");
 * the other two sections read from the tier. The app words the line in its
 * language (`apps/mobile/src/history/outcome.ts`); this decides what it says.
 */

export interface OutcomeInput {
  section: Section
  tier: Tier
  libraryItemId: string
  /** The goal this targeted; the prerequisite card has a topic instead (docs/03). */
  goalTitle?: string | null
  topic?: string | null
}

/** Which verb an outcome line reads with: a library item's own label, or the tier's. */
export type OutcomeVerb =
  { kind: 'libraryItem'; libraryItemId: string } | { kind: 'tier'; tier: Tier }

export interface OutcomeParts {
  verb: OutcomeVerb
  /** Trimmed goal title or topic, whichever the row has; null when neither does. */
  subject: string | null
}

/** The pieces of an outcome line: which verb it reads with, and its subject. */
export function outcomeParts(input: OutcomeInput): OutcomeParts {
  const item = getLibraryItem(input.libraryItemId)
  const verb: OutcomeVerb =
    input.section === 'go_further' && item?.outcomeLabel
      ? { kind: 'libraryItem', libraryItemId: input.libraryItemId }
      : { kind: 'tier', tier: input.tier }
  const subject = input.goalTitle?.trim() || input.topic?.trim() || null
  return { verb, subject }
}
