import { describe, expect, it } from 'vitest'
import type { Block } from '../schemas/blocks'
import { gradeFillBlank, gradeMatching, gradeMcq, gradeOrdering } from './grading'

type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>

const mcq: BlockOf<'mcq'> = {
  kind: 'mcq',
  id: 'q',
  prompt: 'p',
  options: [
    { id: 'a', label: 'a' },
    { id: 'b', label: 'b' },
  ],
}

describe('grading', () => {
  it('leaves opinion-style questions ungraded', () => {
    expect(gradeMcq(mcq, 'a')).toBeNull()
    expect(gradeMcq({ ...mcq, correctId: 'b' }, 'b')).toBe(true)
  })

  it('accepts blanks case-insensitively and via alts, but not blank', () => {
    const block: BlockOf<'fillBlank'> = {
      kind: 'fillBlank',
      id: 'f',
      md: '___',
      blanks: [{ id: 'b1', answer: 'einen', alts: ['1 Kaffee'] }],
    }
    expect(gradeFillBlank(block, { b1: '  EINEN ' })).toBe(true)
    expect(gradeFillBlank(block, { b1: '1 kaffee' })).toBe(true)
    expect(gradeFillBlank(block, { b1: '' })).toBe(false)
    expect(gradeFillBlank(block, {})).toBe(false)
  })

  it('requires the exact sequence for ordering', () => {
    const block: BlockOf<'ordering'> = {
      kind: 'ordering',
      id: 'o',
      prompt: 'p',
      items: [
        { id: 'x', label: 'x' },
        { id: 'y', label: 'y' },
      ],
      correctOrder: ['x', 'y'],
    }
    expect(gradeOrdering(block, ['x', 'y'])).toBe(true)
    expect(gradeOrdering(block, ['y', 'x'])).toBe(false)
    expect(gradeOrdering(block, ['x'])).toBe(false)
  })

  it('requires every left item to hold its own right item', () => {
    const block: BlockOf<'matching'> = {
      kind: 'matching',
      id: 'm',
      prompt: 'p',
      pairs: [
        { leftId: 'l1', left: 'a', rightId: 'r1', right: 'A' },
        { leftId: 'l2', left: 'b', rightId: 'r2', right: 'B' },
      ],
    }
    expect(gradeMatching(block, { l1: 'r1', l2: 'r2' })).toBe(true)
    expect(gradeMatching(block, { l1: 'r2', l2: 'r1' })).toBe(false)
    expect(gradeMatching(block, { l1: 'r1' })).toBe(false)
  })
})
