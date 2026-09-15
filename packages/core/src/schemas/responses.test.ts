import { describe, expect, it } from 'vitest'
import { parseResponsePayload } from './responses'

/** The Zod boundary every interaction crosses before it becomes a `responses` row. */
describe('response payloads', () => {
  it('rejects shapes that are not a known interaction', () => {
    expect(parseResponsePayload({ kind: 'drawing', strokes: [] })).toBeUndefined()
    expect(parseResponsePayload({ kind: 'mcq' })).toBeUndefined()
    expect(parseResponsePayload({ kind: 'mcq', selectedId: 'b', correct: true })).toEqual({
      kind: 'mcq',
      selectedId: 'b',
      correct: true,
    })
  })
})
