import { describe, expect, it } from 'vitest'
import type { Block } from '../schemas/blocks'
import { describeResponse } from './describe'

/** How an answer reaches G6: the question and the label they chose, never our ids. */

const mcq: Block = {
  kind: 'mcq',
  id: 'q1',
  prompt: 'Which is polite?',
  options: [
    { id: 'a', label: 'Ich will einen Kaffee' },
    { id: 'b', label: 'Ich hätte gern einen Kaffee' },
  ],
  correctId: 'b',
}

describe('describeResponse', () => {
  it('describes an answer with the question and the chosen label, not ids', () => {
    const line = describeResponse(mcq, { kind: 'mcq', selectedId: 'b', correct: true })
    expect(line).toBe('Q: Which is polite?\nA: Ich hätte gern einen Kaffee (correct)')
  })

  it('omits the verdict for ungraded (opinion) questions', () => {
    const line = describeResponse(mcq, { kind: 'mcq', selectedId: 'a', correct: null })
    expect(line).toBe('Q: Which is polite?\nA: Ich will einen Kaffee')
  })

  it('resolves labels through the block for every interaction kind', () => {
    const cases: [Block, Parameters<typeof describeResponse>[1], string][] = [
      [
        { kind: 'freeText', id: 'f', prompt: 'Why?' },
        { kind: 'freeText', text: 'Because it is subjunctive.' },
        'Q: Why?\nA: Because it is subjunctive.',
      ],
      [
        { kind: 'fillBlank', id: 'b', md: '___ Kaffee', blanks: [{ id: 'b1', answer: 'einen' }] },
        { kind: 'fillBlank', answers: { b1: 'ein' }, correct: false },
        'Fill in the blanks (some wrong): einen → "ein"',
      ],
      [
        {
          kind: 'ordering',
          id: 'o',
          prompt: 'Order these',
          items: [
            { id: 'x', label: 'first' },
            { id: 'y', label: 'second' },
          ],
          correctOrder: ['x', 'y'],
        },
        { kind: 'ordering', order: ['y', 'x'], correct: false },
        'Q: Order these\nOrdered incorrectly: second → first',
      ],
      [
        {
          kind: 'matching',
          id: 'm',
          prompt: 'Pair them',
          pairs: [
            { leftId: 'l1', left: 'der', rightId: 'r1', right: 'masculine' },
            { leftId: 'l2', left: 'die', rightId: 'r2', right: 'feminine' },
          ],
        },
        { kind: 'matching', pairs: { l1: 'r1', l2: 'r2' }, correct: true },
        'Q: Pair them\nMatched correctly: der = masculine; die = feminine',
      ],
      [
        { kind: 'reveal', id: 'r', prompt: 'What is missing?', md: 'The audience.' },
        { kind: 'reveal', revealed: true },
        'Thought about, then revealed: What is missing?',
      ],
      [
        {
          kind: 'selfRate',
          id: 's',
          prompt: 'How solid is this?',
          scale: [
            { id: '1', label: 'Shaky' },
            { id: '2', label: 'Solid' },
          ],
        },
        { kind: 'selfRate', selectedId: '2' },
        'Self-rated "How solid is this?": Solid',
      ],
    ]
    for (const [block, payload, expected] of cases) {
      expect(describeResponse(block, payload)).toBe(expected)
    }
  })

  it('returns nothing when a payload does not belong to the block', () => {
    expect(describeResponse(mcq, { kind: 'reveal', revealed: true })).toBeUndefined()
  })
})
