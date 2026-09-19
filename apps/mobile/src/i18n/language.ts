import { LANGUAGES, languageFromLocaleTag, type Language } from '@thinkering/core'
import { getLocales } from 'expo-localization'

/**
 * The app language (docs/00 D23): a setting that defaults to the device's
 * language, falling back to English when we don't have it. It picks both the
 * copy and the language the model writes new content in.
 */

/** The languages with copy in the bundle, so the ones the picker offers. */
export const AVAILABLE_LANGUAGES: readonly Language[] = LANGUAGES.filter((l) => l === 'en')

/** The first of the device's preferred languages we have, else English. */
export function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    const language = languageFromLocaleTag(locale.languageTag)
    if (language && AVAILABLE_LANGUAGES.includes(language)) return language
  }
  return 'en'
}

/**
 * The locale dates and numbers are formatted in. The device's own tag when it
 * speaks the app's language, so an `en-GB` phone keeps day-month order; the
 * bare language otherwise.
 */
export function formatLocale(language: Language): string {
  const match = getLocales().find((l) => languageFromLocaleTag(l.languageTag) === language)
  return match?.languageTag ?? language
}
