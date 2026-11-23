import { describe, expect, it } from 'vitest'

import { languageFromLocaleTag, languageOfText } from './language'

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

describe('languageOfText', () => {
  it.each([
    ['学吉他', 'zh-Hans'],
    ['学 Python', 'zh-Hans'],
    ['Learn Python', 'en'],
    ['public speaking', 'en'],
  ])('%s → %s', (text, expected) => {
    expect(languageOfText(text, 'zh-Hans')).toBe(expected)
  })

  it.each(['Python', 'Excel', 'C++', '3D', '', '  '])('%j falls back', (text) => {
    expect(languageOfText(text, 'zh-Hans')).toBe('zh-Hans')
    expect(languageOfText(text, 'en')).toBe('en')
  })
})
