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
  /** 1–2 sentences, shown in the info dialog. */
  overview: string
  /** Why it works — for contributors and prompt context. */
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
