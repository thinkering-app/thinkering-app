import { common } from './common'
import { history } from './history'
import { intake } from './intake'
import { library, type LibraryItemCopy } from './library'
import { me } from './me'
import { path } from './path'
import { player } from './player'
import { today } from './today'

/**
 * The English copy: the source every other language translates, and the
 * fallback for any key a translation is missing. Grouped by the area of the
 * app a string appears in; `common` holds the few shared across areas.
 */
export const en = { common, today, path, history, me, intake, player, library }

export type Translation = typeof en

/**
 * The shape a translation fills in: every English key, each with its own
 * text. Library copy is keyed by item id and may be partial — an item without
 * a translation falls back to its English definition.
 */
export type TranslationOf<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationOf<T[K]>
}
export type LocaleTranslation = TranslationOf<Omit<Translation, 'library'>> & {
  library: Record<string, Partial<LibraryItemCopy>>
}
