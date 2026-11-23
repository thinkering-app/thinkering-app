import { getLibraryItem, outcomeParts, type OutcomeInput, type Tier } from '@thinkering/core'

import { t } from '@/i18n'
import { libraryItemCopy } from '@/i18n/library'

const TIER_KEY = {
  introduce: 'history.outcomeLine.introduce',
  strengthen: 'history.outcomeLine.strengthen',
  apply: 'history.outcomeLine.apply',
} as const satisfies Record<Tier, string>

const TIER_BARE_KEY = {
  introduce: 'history.outcomeLine.introduceBare',
  strengthen: 'history.outcomeLine.strengthenBare',
  apply: 'history.outcomeLine.applyBare',
} as const satisfies Record<Tier, string>

/**
 * The outcome line under a History or calendar row (docs/01 §6, D1), in the
 * app language: the tier's wording, or for Go further the library item's own.
 */
export function outcomeText(row: OutcomeInput): string {
  const { verb, subject } = outcomeParts(row)
  if (verb.kind === 'libraryItem') {
    const item = getLibraryItem(verb.libraryItemId)
    const label = (item && libraryItemCopy(item).outcomeLabel) ?? verb.libraryItemId
    return subject ? t('history.outcomeLine.withVerb', { verb: label, subject }) : label
  }
  return subject ? t(TIER_KEY[verb.tier], { subject }) : t(TIER_BARE_KEY[verb.tier])
}
