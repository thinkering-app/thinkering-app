import { describe, expect, it } from 'vitest'
import { listLlmCalls, logLlmCall } from '../src'
import { openTestDb, testContext } from './helpers'

describe('llm_calls log', () => {
  it('prunes to the newest ~200 calls', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    for (let i = 0; i < 230; i++) {
      ctx.advance(1000)
      logLlmCall(db, ctx, { kind: 'today.plan', model: 'm', request: { i }, status: 'ok' })
    }
    const calls = listLlmCalls(db, 500)
    expect(calls.length).toBe(200)
    // Newest kept, oldest gone.
    expect(calls[0]!.request).toEqual({ i: 229 })
    expect(calls[calls.length - 1]!.request).toEqual({ i: 30 })
  })
})
