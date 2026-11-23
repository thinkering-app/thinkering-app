/**
 * The languages thinkering speaks (docs/00 D23). One list for both halves:
 * the app's own copy and the language the model writes content in. Prompts
 * stay in English whatever the language (docs/04 §Content language).
 */
export const LANGUAGES = ['en', 'zh-Hans'] as const
export type Language = (typeof LANGUAGES)[number]

/** Each language's name in itself, for the picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
}

/**
 * The language for a BCP 47 locale tag (`en-GB`, `zh-Hans-CN`, `zh-CN`), or
 * null when we don't have it. Traditional Chinese (`zh-Hant`, `zh-TW`,
 * `zh-HK`) is null rather than Simplified: the scripts differ.
 */
export function languageFromLocaleTag(tag: string): Language | null {
  const parts = tag.toLowerCase().replace(/_/g, '-').split('-')
  const [lang, ...rest] = parts
  if (lang === 'en') return 'en'
  if (lang === 'zh') {
    if (rest.includes('hant')) return null
    if (rest.includes('hans')) return 'zh-Hans'
    if (rest.some((r) => r === 'tw' || r === 'hk' || r === 'mo')) return null
    return 'zh-Hans'
  }
  return null
}

/**
 * The language someone wrote in, read from its script: any Chinese character
 * makes it Chinese, and two or more words in Latin letters make it English.
 * Anything else says nothing, so `fallback` stands: a lone name ("Python",
 * "Excel") is how people write it in either language, and "C++" or "3D" has
 * no words at all. Used to pick an interest's content language from what was
 * typed at intake, and the language of a question asked mid-activity
 * (docs/00 D23).
 */
export function languageOfText(text: string, fallback: Language): Language {
  if (/\p{Script=Han}/u.test(text)) return 'zh-Hans'
  const latinWords = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []
  return latinWords.length >= 2 ? 'en' : fallback
}
