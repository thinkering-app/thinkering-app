import { LIBRARY_ITEMS } from '@thinkering/core'

/** What a learner sees of a library item (docs/06). */
export interface LibraryItemCopy {
  name: string
  overview: string
  whyItHelps: string
  activation?: string
  outcomeLabel?: string
}

/**
 * The English library copy is the definitions' own (packages/core), so it
 * can't drift from them; translations key theirs by item id.
 */
export const library: Record<string, LibraryItemCopy> = Object.fromEntries(
  LIBRARY_ITEMS.map((item) => [
    item.id,
    {
      name: item.name,
      overview: item.overview,
      whyItHelps: item.whyItHelps,
      ...(item.activation ? { activation: item.activation } : {}),
      ...(item.outcomeLabel ? { outcomeLabel: item.outcomeLabel } : {}),
    },
  ]),
)
