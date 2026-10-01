import { describe, expect, it } from 'vitest'
import type { Block } from '../schemas/blocks'
import { gradeBlank, gradeFillBlank, gradeMatching, gradeMcq, gradeOrdering } from './grading'

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

  it('forgives articles, punctuation and one typo in a long answer, but not a near-miss word', () => {
    const blank = (answer: string) => ({ id: 'b', answer })
    expect(gradeBlank(blank('mitochondria'), 'The mitochondria.')).toBe(true)
    expect(gradeBlank(blank('the cell'), 'cell')).toBe(true)
    expect(gradeBlank(blank('self-attention'), 'self attention')).toBe(true)
    expect(gradeBlank(blank('mitochondria'), 'mitochondira')).toBe(true)
    expect(gradeBlank(blank('mitochondria'), 'mitocondria')).toBe(true)
    expect(gradeBlank(blank('mitochondria'), 'mitocondrai')).toBe(false)
    expect(gradeBlank(blank('an apple'), 'the apple')).toBe(false)
    expect(gradeBlank(blank('effect'), 'affect')).toBe(false)
    expect(gradeBlank(blank('19140000'), '19150000')).toBe(false)
    expect(gradeBlank(blank('the'), '')).toBe(false)
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
