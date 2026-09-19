import type { LibraryItem } from '@thinkering/core'

import { i18n } from './index'
import type { LibraryItemCopy } from './locales/en/library'

/**
 * A library item's learner-facing copy in the app language, field by field
 * falling back to the English definition. The model-facing fields
 * (`pedagogy`, `goodFor`, the names in prompts) stay English: prompts are.
 */
export function libraryItemCopy(item: LibraryItem): LibraryItemCopy {
  const field = (key: keyof LibraryItemCopy, english: string): string =>
    i18n.t(`library.${item.id}.${key}` as never, { defaultValue: english })
  return {
    name: field('name', item.name),
    overview: field('overview', item.overview),
    whyItHelps: field('whyItHelps', item.whyItHelps),
    ...(item.activation ? { activation: field('activation', item.activation) } : {}),
    ...(item.outcomeLabel ? { outcomeLabel: field('outcomeLabel', item.outcomeLabel) } : {}),
  }
}
