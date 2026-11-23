import { describe, expect, it } from 'vitest'

import { languageFromLocaleTag } from './language'

describe('languageFromLocaleTag', () => {
  it.each([
    ['en', 'en'],
    ['en-GB', 'en'],
    ['zh-Hans-CN', 'zh-Hans'],
    ['zh-CN', 'zh-Hans'],
    ['zh-SG', 'zh-Hans'],
    ['zh', 'zh-Hans'],
  ])('%s → %s', (tag, expected) => {
    expect(languageFromLocaleTag(tag)).toBe(expected)
  })

  it.each(['zh-Hant-TW', 'zh-TW', 'zh-HK', 'es-MX', 'fr-FR', ''])('%s has no language', (tag) => {
    expect(languageFromLocaleTag(tag)).toBeNull()
  })
})
