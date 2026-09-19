import type { Section } from '../domain'
import type { BlockKind } from '../schemas/blocks'

/**
 * A library item is a reusable learning strategy consumed by G5a (selection) and
 * G5b (structure). Definitions live in code, not the DB (docs/06-library.md).
 */
export interface LibraryItem {
  id: string
  /** Shown in configure sheets. */
  name: string
  sections: Section[]
  /** What you'll do, in 12 words or fewer. Shown in the info dialog. */
  overview: string
  /** One plain sentence on why the strategy helps, for learners. Shown in the info dialog. */
  whyItHelps: string
  /** When the item switches itself on or off, for the two situational items. Shown in the info dialog. */
  activation?: string
  /** Why it works — for contributors and prompt context, never shown to learners. */
  pedagogy: string
  /** Ordered page intents G5b follows. */
  pageSkeleton: string[]
  /** Preferred interactive blocks. */
  interactions: BlockKind[]
  defaultActive: boolean
  /** Selection hint for G5a (domains/situations). */
  goodFor?: string
  /** go_further items only. */
  flavor?: 'apply' | 'extend'
  /** go_further items only — History wording (D1), e.g. "Put to use". */
  outcomeLabel?: string
  /** Item is built around a saved resource (video/article). */
  usesResources?: boolean
  /** The kind of saved resource the item prefers, when it has one. */
  resourceMedia?: 'video' | 'article'
}
