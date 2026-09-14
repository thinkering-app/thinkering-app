import { describe, expect, it } from 'vitest'
import { uuidv7 } from '../src/uuid'

describe('uuidv7', () => {
  it('emits RFC-9562 v7 ids', () => {
    const id = uuidv7(1_700_000_000_000)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('sorts by generation time, including within one millisecond', () => {
    const ids = [uuidv7(1_000), uuidv7(1_000), uuidv7(1_000), uuidv7(2_000)]
    expect([...ids].sort()).toEqual(ids)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
