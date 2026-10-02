import { describe, expect, it } from 'vitest'
import { withoutLeadNumber } from './numbering'

describe('withoutLeadNumber', () => {
  it.each([
    ['1', ''],
    ['2.', ''],
    ['Step 3', ''],
    ['step 4:', ''],
    ['Step 2: Pivot from the shoulder', 'Pivot from the shoulder'],
    ['Step 2 — Pivot', 'Pivot'],
    ['1. Lock your wrist', 'Lock your wrist'],
    ['2) Swing once', 'Swing once'],
    ['3: Commit', 'Commit'],
  ])('drops the marker from %j', (text, expected) => {
    expect(withoutLeadNumber(text)).toBe(expected)
  })

  it.each([
    '3 eggs, beaten',
    '1.5 cups of flour',
    '1990s design',
    'Stepping back',
    'Lock your wrist',
  ])('keeps %j as written', (text) => {
    expect(withoutLeadNumber(text)).toBe(text)
  })
})
