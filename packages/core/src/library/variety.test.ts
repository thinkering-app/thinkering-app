import { describe, expect, it } from 'vitest'
import { varyLibraryItems } from './variety'

describe('varyLibraryItems', () => {
  const usable = ['plain-explainer', 'worked-example', 'guided-discovery']

  it('drops an item the last two activities both used', () => {
    expect(varyLibraryItems(usable, ['worked-example', 'worked-example', 'mini-case'])).toEqual([
      'plain-explainer',
      'guided-discovery',
    ])
  })

  it('leaves the choice alone after one use, or a mix', () => {
    expect(varyLibraryItems(usable, ['worked-example'])).toEqual(usable)
    expect(varyLibraryItems(usable, ['worked-example', 'plain-explainer'])).toEqual(usable)
  })

  it('never empties the choice', () => {
    expect(varyLibraryItems(['worked-example'], ['worked-example', 'worked-example'])).toEqual([
      'worked-example',
    ])
  })
})
