import { render, screen } from '@testing-library/react-native'
import { Trans } from 'react-i18next'
import { Text } from 'react-native'

import { en } from './locales/en'

/**
 * <Trans> parses copy as HTML, so a tag named after an HTML void element
 * (`<link>`, `<img>`, `<br>`…) can't wrap anything: `<link>Assembly Code</link>`
 * renders an empty link with the words after it.
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k))
  return []
}

describe('copy markup', () => {
  it('names no component tag after an HTML void element', () => {
    const offending = strings(en, '').filter(([, s]) =>
      [...s.matchAll(/<\/?(\w+)>/g)].some((m) => VOID_ELEMENTS.has(m[1]!.toLowerCase())),
    )
    expect(offending).toEqual([])
  })

  it('wraps a link around its words', async () => {
    await render(
      <Text>
        <Trans i18nKey="me.about.intro" components={{ a: <Text testID="link" /> }} />
      </Text>,
    )
    expect(screen.getByTestId('link')).toHaveTextContent('Assembly Code')
  })
})
