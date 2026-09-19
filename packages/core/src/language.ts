/**
 * The languages thinkering speaks (docs/00 D23). One list for both halves:
 * the app's own copy and the language the model writes content in. Prompts
 * stay in English whatever the language (docs/04 §Content language).
 */
export const LANGUAGES = ['en', 'es', 'zh-Hans'] as const
export type Language = (typeof LANGUAGES)[number]

/** Each language's name in itself, for the picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  'zh-Hans': '简体中文',
}

/**
 * The language for a BCP 47 locale tag (`es-MX`, `zh-Hans-CN`, `zh-CN`), or
 * null when we don't have it. Traditional Chinese (`zh-Hant`, `zh-TW`,
 * `zh-HK`) is null rather than Simplified: the scripts differ.
 */
export function languageFromLocaleTag(tag: string): Language | null {
  const parts = tag.toLowerCase().replace(/_/g, '-').split('-')
  const [lang, ...rest] = parts
  if (lang === 'en') return 'en'
  if (lang === 'es') return 'es'
  if (lang === 'zh') {
    if (rest.includes('hant')) return null
    if (rest.includes('hans')) return 'zh-Hans'
    if (rest.some((r) => r === 'tw' || r === 'hk' || r === 'mo')) return null
    return 'zh-Hans'
  }
  return null
}
