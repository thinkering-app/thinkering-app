import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '@thinkering/core'

import { deviceLanguage, formatLocale } from './language'
import { en } from './locales/en'

export { AVAILABLE_LANGUAGES } from './language'

/**
 * App copy (docs/07 §Copy). Components read strings with `useTranslation()`
 * from react-i18next; code outside React uses `t` from here. Keys are typed
 * against the English source, so a misspelt key fails typecheck.
 *
 * Starts in the device language so copy shown before the database opens (the
 * splash, a migration failure) reads right; `useAppLanguage` (./preference)
 * then applies the stored choice.
 */
export const i18n = createInstance()

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Everything is bundled, so init completes synchronously.
  initAsync: false,
})

export const t = i18n.t.bind(i18n)

/** The language copy is showing in, and new content is generated in. */
export function currentLanguage(): Language {
  return i18n.language as Language
}

/** The locale for `Intl` date and number formatting. */
export function currentFormatLocale(): string {
  return formatLocale(currentLanguage())
}
